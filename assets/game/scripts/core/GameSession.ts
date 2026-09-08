import {
  CAT_TYPES, CatType, ChainPiece, DomainEvent, GameState, LevelConfig,
  PieceSpawnConfig, SessionSnapshot, ShotPiece,
} from './Types';
import { Mulberry32 } from './Random';

const CAT_SPACING = 66;
const LOSS_MARGIN = 24;
const MAX_RESOLVE_DEPTH = 32;

function cloneShot(shot: ShotPiece): ShotPiece {
  return { kind: shot.kind, catType: shot.catType };
}

export class GameSession {
  public state: GameState = 'Intro';
  public elapsedMs = 0;
  public score = 0;
  public purr = 0;
  public combo = 0;
  public readonly pieces: ChainPiece[] = [];
  public currentShot: ShotPiece;
  public nextShot: ShotPiece;
  public reviveUsed = false;

  private readonly rng: Mulberry32;
  private readonly pendingSpawns: PieceSpawnConfig[];
  private readonly scriptedShots: ShotPiece[];
  private readonly events: DomainEvent[] = [];
  private nextPieceId = 1;
  private shotCursor = 0;
  private frenzyQueued = false;

  public constructor(
    public readonly level: LevelConfig,
    public readonly pathLength: number,
    attemptIndex = 0,
  ) {
    this.rng = new Mulberry32((level.seed ^ attemptIndex) >>> 0);
    this.pendingSpawns = level.wavePieces.map((piece) => ({ ...piece }));
    this.scriptedShots = (level.scriptedShots ?? []).map(cloneShot);
    const headDistance = Math.min(pathLength * 0.58, pathLength - 500);
    for (let i = 0; i < level.initialPieces.length; i++) {
      this.pieces.push(this.createPiece(level.initialPieces[i], headDistance - i * CAT_SPACING));
    }
    this.currentShot = this.makeShot();
    this.nextShot = this.makeShot();
    this.assertInvariants();
  }

  public get remainingToSpawn(): number {
    return this.pendingSpawns.length;
  }

  public start(): void {
    if (this.state !== 'Intro') return;
    this.state = 'Playing';
  }

  public pause(): void {
    if (this.state === 'Playing') this.state = 'Paused';
  }

  public resume(): void {
    if (this.state === 'Paused') this.state = 'Playing';
  }

  public tick(deltaSeconds: number): void {
    if (this.state !== 'Playing') return;
    const dt = Math.min(0.1, Math.max(0, deltaSeconds));
    this.elapsedMs += dt * 1000;
    for (const piece of this.pieces) piece.distance += this.level.speed * dt;

    if (this.level.safeClampMs && this.elapsedMs < this.level.safeClampMs && this.pieces[0]) {
      const cap = this.pathLength * 0.7;
      const overflow = Math.max(0, this.pieces[0].distance - cap);
      if (overflow > 0) for (const piece of this.pieces) piece.distance -= overflow;
    }

    const tail = this.pieces[this.pieces.length - 1];
    if (this.pendingSpawns.length > 0 && (!tail || tail.distance >= CAT_SPACING)) {
      const config = this.pendingSpawns.shift();
      if (config) this.pieces.push(this.createPiece(config, 0));
    }

    if (this.level.purrGuaranteeMs && this.elapsedMs >= this.level.purrGuaranteeMs && this.purr < 100) {
      this.setPurr(100);
    }
    if (this.purr >= 100) this.frenzyQueued = true;
    if (this.frenzyQueued) this.runFrenzy();
    this.checkOutcome();
    this.assertInvariants();
  }

  public shootAtDistance(distance: number): boolean {
    if (this.state !== 'Playing' || this.pieces.length === 0) return false;
    this.state = 'Projectile';
    const clamped = Math.max(0, Math.min(this.pathLength, distance));
    const insertionIndex = this.findInsertionIndex(clamped);
    const piece = this.createPiece({
      kind: this.currentShot.kind,
      catType: this.currentShot.catType,
    }, clamped);
    this.pieces.splice(insertionIndex, 0, piece);
    this.events.push({ type: 'PieceInserted', pieceId: piece.id, index: insertionIndex });
    this.currentShot = this.nextShot;
    this.nextShot = this.makeShot();
    this.state = 'Resolving';
    this.resolveAt(insertionIndex, 1);
    if (this.state === 'Resolving') this.state = 'Playing';
    this.checkOutcome();
    this.assertInvariants();
    return true;
  }

  public swapShots(): boolean {
    if (this.state !== 'Playing') return false;
    [this.currentShot, this.nextShot] = [this.nextShot, this.currentShot];
    return true;
  }

  public useRainbow(): boolean {
    if (this.state !== 'Playing') return false;
    this.currentShot = { kind: 'rainbow', catType: null };
    return true;
  }

  public useWand(index: number): boolean {
    if (this.state !== 'Playing' || !this.pieces[index]) return false;
    const piece = this.pieces[index];
    if (piece.kind === 'normal' || piece.kind === 'rainbow') {
      this.removeIndices([index], 'booster');
    } else {
      this.damageObstacle(index);
    }
    this.compact();
    this.resolveAt(Math.max(0, index - 1), 1);
    this.checkOutcome();
    return true;
  }

  public useCatnip(index: number): boolean {
    if (this.state !== 'Playing' || !this.pieces[index]) return false;
    const start = Math.max(0, index - 2);
    const end = Math.min(this.pieces.length - 1, index + 2);
    const removals: number[] = [];
    for (let i = start; i <= end; i++) {
      if (this.pieces[i].kind === 'normal' || this.pieces[i].kind === 'rainbow') removals.push(i);
      else this.damageObstacle(i);
    }
    this.removeIndices(removals, 'booster');
    this.compact();
    this.resolveAt(Math.max(0, start - 1), 1);
    this.checkOutcome();
    return true;
  }

  public revive(): boolean {
    if (this.state !== 'Lost' || this.reviveUsed) return false;
    this.reviveUsed = true;
    for (const piece of this.pieces) piece.distance = Math.max(0, piece.distance - CAT_SPACING * 6);
    this.state = 'Playing';
    return true;
  }

  public drainEvents(): DomainEvent[] {
    return this.events.splice(0, this.events.length);
  }

  public snapshot(): SessionSnapshot {
    return {
      levelId: this.level.id,
      state: this.state,
      elapsedMs: this.elapsedMs,
      score: this.score,
      purr: this.purr,
      remainingToSpawn: this.pendingSpawns.length,
      pieces: this.pieces.map((piece) => ({ ...piece })),
      currentShot: cloneShot(this.currentShot),
      nextShot: cloneShot(this.nextShot),
      rngState: this.rng.state,
      reviveUsed: this.reviveUsed,
    };
  }

  public stars(): number {
    if (this.state !== 'Won') return 0;
    if (this.score >= this.level.score3Star) return 3;
    if (this.score >= this.level.score2Star) return 2;
    return 1;
  }

  private createPiece(config: PieceSpawnConfig, distance: number): ChainPiece {
    const kind = config.kind;
    return {
      id: this.nextPieceId++,
      kind,
      catType: kind === 'normal' ? config.catType : kind === 'rainbow' ? null : null,
      hiddenCatType: config.hiddenCatType,
      hp: config.hp ?? (kind === 'boxed' ? 2 : kind === 'dusty' ? 1 : 0),
      distance,
    };
  }

  private makeShot(): ShotPiece {
    if (this.shotCursor < this.scriptedShots.length) return cloneShot(this.scriptedShots[this.shotCursor++]);
    const counts = new Map<CatType, number>();
    const pairs = new Map<CatType, number>();
    for (let i = 0; i < this.pieces.length; i++) {
      const type = this.pieces[i].kind === 'normal' ? this.pieces[i].catType : null;
      if (!type) continue;
      counts.set(type, (counts.get(type) ?? 0) + 1);
      if (this.pieces[i + 1]?.kind === 'normal' && this.pieces[i + 1].catType === type) pairs.set(type, (pairs.get(type) ?? 0) + 1);
    }
    const weighted: CatType[] = [];
    for (const type of CAT_TYPES) {
      const count = counts.get(type) ?? 0;
      if (count === 0) continue;
      const weight = 2 + Math.round((pairs.get(type) ?? 0) * 4 * this.level.helperStrength);
      for (let i = 0; i < weight; i++) weighted.push(type);
    }
    const catType = weighted.length > 0 ? weighted[this.rng.integer(weighted.length)] : CAT_TYPES[this.rng.integer(CAT_TYPES.length)];
    return { kind: 'normal', catType };
  }

  private findInsertionIndex(distance: number): number {
    let index = 0;
    while (index < this.pieces.length && this.pieces[index].distance > distance) index++;
    return index;
  }

  private resolveAt(index: number, chainDepth: number): void {
    if (chainDepth > MAX_RESOLVE_DEPTH || this.pieces.length < 3) return;
    const group = this.groupAt(Math.min(index, this.pieces.length - 1));
    if (group.length < 3) {
      this.combo = 0;
      this.events.push({ type: 'ComboChanged', value: 0 });
      this.compact();
      return;
    }
    const ids = group.map((i) => this.pieces[i].id);
    this.events.push({ type: 'MatchStarted', pieceIds: ids, chainDepth });
    const leftObstacle = group[0] - 1;
    const rightObstacle = group[group.length - 1] + 1;
    this.damageObstacle(leftObstacle);
    if (rightObstacle !== leftObstacle) this.damageObstacle(rightObstacle);
    this.removeIndices(group, 'match');
    const multiplier = Math.min(1 + (chainDepth - 1) * 0.5, 4);
    this.score += Math.round(group.length * 100 * multiplier);
    this.combo = chainDepth;
    this.events.push({ type: 'ComboChanged', value: chainDepth });
    const gain = (group.length * 8 + Math.max(0, group.length - 3) * 4 + Math.max(0, chainDepth - 1) * 10) * this.level.purrMultiplier;
    this.setPurr(this.purr + gain);
    const seam = Math.max(0, group[0] - 1);
    this.compact();
    this.resolveAt(seam, chainDepth + 1);
  }

  private groupAt(index: number): number[] {
    const pivot = this.pieces[index];
    if (!pivot || (pivot.kind !== 'normal' && pivot.kind !== 'rainbow')) return [];
    let target = pivot.catType;
    if (pivot.kind === 'rainbow') target = this.chooseRainbowType(index);
    if (!target) return [];
    let start = index;
    let end = index;
    while (start > 0 && this.matches(this.pieces[start - 1], target)) start--;
    while (end + 1 < this.pieces.length && this.matches(this.pieces[end + 1], target)) end++;
    const result: number[] = [];
    for (let i = start; i <= end; i++) result.push(i);
    return result;
  }

  private chooseRainbowType(index: number): CatType | null {
    const left = this.contiguousTypeCount(index - 1, -1);
    const right = this.contiguousTypeCount(index + 1, 1);
    if (!left.type) return right.type;
    if (!right.type) return left.type;
    if (left.count >= right.count) return left.type;
    return right.type;
  }

  private contiguousTypeCount(start: number, direction: -1 | 1): { type: CatType | null; count: number } {
    const first = this.pieces[start];
    if (!first || first.kind !== 'normal' || !first.catType) return { type: null, count: 0 };
    const type = first.catType;
    let count = 0;
    for (let i = start; this.pieces[i] && this.pieces[i].kind === 'normal' && this.pieces[i].catType === type; i += direction) count++;
    return { type, count };
  }

  private matches(piece: ChainPiece, target: CatType): boolean {
    return piece.kind === 'rainbow' || (piece.kind === 'normal' && piece.catType === target);
  }

  private damageObstacle(index: number): void {
    const piece = this.pieces[index];
    if (!piece || (piece.kind !== 'boxed' && piece.kind !== 'dusty')) return;
    piece.hp--;
    this.events.push({ type: 'ObstacleDamaged', pieceId: piece.id, hp: piece.hp });
    if (piece.hp <= 0) {
      piece.kind = 'normal';
      piece.catType = piece.hiddenCatType ?? 'orange';
      this.events.push({ type: 'ObstacleRevealed', pieceId: piece.id, catType: piece.catType });
    }
  }

  private removeIndices(indices: number[], reason: 'match' | 'frenzy' | 'booster'): void {
    if (indices.length === 0) return;
    const unique = [...new Set(indices)].sort((a, b) => b - a);
    const ids: number[] = [];
    for (const index of unique) {
      if (!this.pieces[index]) continue;
      ids.push(this.pieces[index].id);
      this.pieces.splice(index, 1);
      if (reason === 'booster') this.score += 20;
    }
    this.events.push({ type: 'PiecesRemoved', pieceIds: ids, reason });
  }

  private compact(): void {
    for (let i = 1; i < this.pieces.length; i++) {
      this.pieces[i].distance = this.pieces[i - 1].distance - CAT_SPACING;
    }
    this.events.push({ type: 'GapCompacted' });
  }

  private setPurr(value: number): void {
    this.purr = Math.max(0, Math.min(100, value));
    this.events.push({ type: 'PurrChanged', value: this.purr });
    if (this.purr >= 100) this.frenzyQueued = true;
  }

  private runFrenzy(): void {
    if (this.state !== 'Playing' || this.pieces.length === 0) return;
    const counts = new Map<CatType, { count: number; head: number }>();
    for (const piece of this.pieces) {
      if (piece.kind !== 'normal' || !piece.catType) continue;
      const current = counts.get(piece.catType) ?? { count: 0, head: piece.distance };
      current.count++;
      current.head = Math.max(current.head, piece.distance);
      counts.set(piece.catType, current);
    }
    let target: CatType | null = null;
    for (const type of CAT_TYPES) {
      const candidate = counts.get(type);
      if (!candidate) continue;
      const best = target ? counts.get(target) : undefined;
      if (!best || candidate.count > best.count || (candidate.count === best.count && candidate.head > best.head)) target = type;
    }
    if (!target) return;
    this.state = 'Frenzy';
    this.events.push({ type: 'FrenzyStarted', catType: target });
    const indices: number[] = [];
    for (let i = 0; i < this.pieces.length; i++) if (this.pieces[i].kind === 'normal' && this.pieces[i].catType === target) indices.push(i);
    const ids = indices.map((i) => this.pieces[i].id);
    this.removeIndices(indices, 'frenzy');
    this.score += ids.length * 80;
    this.events.push({ type: 'FrenzyRemoved', pieceIds: ids });
    this.purr = 0;
    this.events.push({ type: 'PurrChanged', value: 0 });
    this.frenzyQueued = false;
    this.compact();
    this.state = 'Playing';
    this.resolveAt(Math.max(0, this.pieces.length - 2), 1);
  }

  private checkOutcome(): void {
    if (this.state === 'Won' || this.state === 'Lost' || this.state === 'Frenzy' || this.state === 'Resolving') return;
    if (this.pendingSpawns.length === 0 && this.pieces.length === 0) {
      this.state = 'Won';
      this.events.push({ type: 'SessionWon', score: this.score, stars: this.stars() });
      return;
    }
    if (this.pieces[0]?.distance >= this.pathLength - LOSS_MARGIN) {
      this.state = 'Lost';
      this.events.push({ type: 'SessionLost', reason: 'home_reached' });
    }
  }

  private assertInvariants(): void {
    const ids = new Set<number>();
    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i];
      if (!Number.isFinite(piece.distance)) throw new Error('Non-finite piece distance');
      if (ids.has(piece.id)) throw new Error(`Duplicate piece id ${piece.id}`);
      ids.add(piece.id);
      if (i > 0 && this.pieces[i - 1].distance <= piece.distance) throw new Error('Pieces are not strictly distance-sorted');
    }
  }
}

