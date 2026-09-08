import { LEVELS } from '../configs/Levels';
import { PATHS } from '../configs/Paths';
import { GameSession } from '../scripts/core/GameSession';
import { validateLevels } from '../scripts/core/LevelValidator';
import { PathSampler } from '../scripts/core/PathSampler';
import { Mulberry32 } from '../scripts/core/Random';
import { CAT_TYPES, CatType, LevelConfig, PieceSpawnConfig, ShotPiece } from '../scripts/core/Types';
import { SaveService, defaultSave } from '../scripts/services/SaveService';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function normal(type: CatType): PieceSpawnConfig {
  return { kind: 'normal', catType: type };
}

function testLevel(overrides: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: 1,
    chapter: 1,
    name: 'test',
    pathId: 'path_c',
    seed: 123,
    speed: 0,
    initialPieces: [normal('blue'), normal('blue'), normal('orange')],
    wavePieces: [normal('orange')],
    scriptedShots: [{ kind: 'normal', catType: 'blue' }],
    helperStrength: 1,
    purrMultiplier: 1,
    score2Star: 500,
    score3Star: 1000,
    allowedBoosters: [],
    ...overrides,
  };
}

function verifySnapshot(session: GameSession): void {
  const snapshot = session.snapshot();
  const ids = new Set<number>();
  snapshot.pieces.forEach((piece, index) => {
    assert(!ids.has(piece.id), 'piece ids must be unique');
    ids.add(piece.id);
    assert(Number.isFinite(piece.distance), 'distance must be finite');
    if (index > 0) assert(snapshot.pieces[index - 1].distance > piece.distance, 'pieces must stay sorted');
  });
  assert(snapshot.purr >= 0 && snapshot.purr <= 100, 'purr must stay in range');
}

function runUnitTests(): number {
  let count = 0;
  validateLevels(LEVELS, new Set(Object.keys(PATHS)));
  assert(LEVELS.length === 24, 'exactly 24 levels are required');
  assert(new Set(LEVELS[0].initialPieces.map((piece) => piece.catType)).size === 5, 'level one must show all five cats');
  count += 3;

  const path = new PathSampler(PATHS.path_c);
  assert(path.length > 1000, 'path must be long enough');
  const middle = path.sampleAtDistance(path.length / 2);
  const projection = path.projectPoint(middle.position);
  assert(Math.abs(projection.distance - path.length / 2) < 8, 'path projection should round-trip');
  count += 2;

  const a = new Mulberry32(42);
  const b = new Mulberry32(42);
  for (let i = 0; i < 20; i++) assert(a.next() === b.next(), 'PRNG must be deterministic');
  count++;

  const session = new GameSession(testLevel(), path.length);
  session.start();
  const target = (session.pieces[0].distance + session.pieces[1].distance) / 2;
  assert(session.shootAtDistance(target), 'shot should be accepted');
  assert(session.pieces.filter((piece) => piece.catType === 'blue').length === 0, 'three blue cats should return home');
  assert(session.score === 300, 'three-cat score should be 300');
  verifySnapshot(session);
  count += 4;

  const obstacle = new GameSession(testLevel({
    initialPieces: [normal('blue'), normal('blue'), { kind: 'boxed', catType: null, hiddenCatType: 'orange', hp: 2 }],
  }), path.length);
  obstacle.start();
  obstacle.shootAtDistance((obstacle.pieces[0].distance + obstacle.pieces[1].distance) / 2);
  const box = obstacle.pieces.find((piece) => piece.kind === 'boxed');
  assert(box?.hp === 1, 'adjacent match should damage a box once');
  count++;

  const guaranteed = new GameSession(testLevel({ purrGuaranteeMs: 100, initialPieces: CAT_TYPES.map(normal) }), path.length);
  guaranteed.start();
  guaranteed.tick(0.1);
  assert(guaranteed.purr === 0, 'guaranteed frenzy should consume the full meter');
  assert(guaranteed.pieces.length === 4, 'frenzy should remove the selected most common type');
  count += 2;

  const memory = new Map<string, string>();
  const saveService = new SaveService({ getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => { memory.set(key, value); } });
  const save = defaultSave();
  const reward = saveService.recordWin(save, 1, 4200, 3);
  assert(reward === 82, 'first three-star level reward should include the first-win bonus');
  assert(saveService.load().bestStarsByLevel['1'] === 3, 'save should survive encode/decode');
  count += 2;
  return count;
}

function runSimulations(): number {
  let simulations = 0;
  for (let seed = 0; seed < 1000; seed++) {
    const level = LEVELS[seed % LEVELS.length];
    const path = new PathSampler(PATHS[level.pathId]);
    const session = new GameSession(level, path.length, seed);
    session.start();
    const driver = new Mulberry32(seed ^ 0xA11CE);
    for (let step = 0; step < 180 && session.state === 'Playing'; step++) {
      session.tick(1 / 15);
      if (session.state !== 'Playing' || session.pieces.length === 0) continue;
      if (step % 3 === 0) {
        const index = driver.integer(session.pieces.length);
        session.shootAtDistance(session.pieces[index].distance + (driver.next() - 0.5) * 40);
      }
      if (step % 31 === 0 && level.allowedBoosters.includes('wand')) session.useWand(driver.integer(session.pieces.length));
      verifySnapshot(session);
    }
    verifySnapshot(session);
    simulations++;
  }
  return simulations;
}

export function runAll(): { assertions: number; simulations: number } {
  return { assertions: runUnitTests(), simulations: runSimulations() };
}

