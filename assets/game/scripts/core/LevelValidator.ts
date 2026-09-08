import { CAT_TYPES, LevelConfig } from './Types';

export function validateLevels(levels: LevelConfig[], pathIds: ReadonlySet<string>): void {
  if (levels.length === 0) throw new Error('No levels configured');
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    if (level.id !== i + 1) throw new Error(`Level id must be continuous at index ${i}`);
    if (!pathIds.has(level.pathId)) throw new Error(`Unknown path ${level.pathId} in level ${level.id}`);
    if (level.initialPieces.length === 0 || level.wavePieces.length === 0) throw new Error(`Level ${level.id} has an empty spawn list`);
    if (level.score2Star >= level.score3Star) throw new Error(`Level ${level.id} star thresholds are invalid`);
    for (const piece of [...level.initialPieces, ...level.wavePieces]) {
      if (piece.catType !== null && !CAT_TYPES.includes(piece.catType)) throw new Error(`Invalid cat type in level ${level.id}`);
      if ((piece.kind === 'boxed' || piece.kind === 'dusty') && !piece.hiddenCatType) throw new Error(`Obstacle without hidden cat in level ${level.id}`);
    }
  }
}

