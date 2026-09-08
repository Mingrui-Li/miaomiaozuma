export const CAT_TYPES = ['orange', 'ragdoll', 'blue', 'calico', 'black'] as const;

export type CatType = typeof CAT_TYPES[number];
export type PieceKind = 'normal' | 'boxed' | 'dusty' | 'rainbow';
export type GameState = 'Loading' | 'Intro' | 'Playing' | 'Projectile' | 'Resolving' | 'Frenzy' | 'Paused' | 'Won' | 'Lost';
export type BoosterType = 'wand' | 'catnip' | 'rainbow';

export interface Vec2Data {
  x: number;
  y: number;
}

export interface CubicSegmentConfig {
  p0: Vec2Data;
  p1: Vec2Data;
  p2: Vec2Data;
  p3: Vec2Data;
}

export interface ChainPiece {
  id: number;
  kind: PieceKind;
  catType: CatType | null;
  hiddenCatType?: CatType;
  hp: number;
  distance: number;
}

export interface ShotPiece {
  kind: 'normal' | 'rainbow';
  catType: CatType | null;
}

export interface PieceSpawnConfig {
  kind: PieceKind;
  catType: CatType | null;
  hiddenCatType?: CatType;
  hp?: number;
}

export interface LevelConfig {
  id: number;
  chapter: number;
  name: string;
  pathId: string;
  seed: number;
  speed: number;
  initialPieces: PieceSpawnConfig[];
  wavePieces: PieceSpawnConfig[];
  scriptedShots?: ShotPiece[];
  helperStrength: number;
  purrMultiplier: number;
  purrGuaranteeMs?: number;
  safeClampMs?: number;
  score2Star: number;
  score3Star: number;
  allowedBoosters: BoosterType[];
}

export type DomainEvent =
  | { type: 'PieceInserted'; pieceId: number; index: number }
  | { type: 'MatchStarted'; pieceIds: number[]; chainDepth: number }
  | { type: 'PiecesRemoved'; pieceIds: number[]; reason: 'match' | 'frenzy' | 'booster' }
  | { type: 'ObstacleDamaged'; pieceId: number; hp: number }
  | { type: 'ObstacleRevealed'; pieceId: number; catType: CatType }
  | { type: 'GapCompacted' }
  | { type: 'ComboChanged'; value: number }
  | { type: 'PurrChanged'; value: number }
  | { type: 'FrenzyStarted'; catType: CatType }
  | { type: 'FrenzyRemoved'; pieceIds: number[] }
  | { type: 'SessionWon'; score: number; stars: number }
  | { type: 'SessionLost'; reason: 'home_reached' };

export interface SessionSnapshot {
  levelId: number;
  state: GameState;
  elapsedMs: number;
  score: number;
  purr: number;
  remainingToSpawn: number;
  pieces: ChainPiece[];
  currentShot: ShotPiece;
  nextShot: ShotPiece;
  rngState: number;
  reviveUsed: boolean;
}

