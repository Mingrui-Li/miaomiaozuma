import { CAT_TYPES, CatType, LevelConfig, PieceSpawnConfig, ShotPiece } from '../scripts/core/Types';

type Row = [number, string, string, number, number, number, number, number, number, number, number, number];

const ROWS: Row[] = [
  [1,'五猫迎宾','path_c',14,18,16,0,0,1.00,1.80,2600,4200],
  [2,'换个位置','path_c',15,20,18,0,0,0.95,1.35,3200,5000],
  [3,'第一次大贴贴','path_s',16,22,20,0,0,0.90,1.10,3800,6000],
  [4,'弯弯猫步','path_c',17,24,22,0,0,0.85,1.05,4300,6800],
  [5,'连锁呼噜','path_s',18,25,24,0,0,0.82,1.00,5000,7800],
  [6,'一圈回窝','path_spiral',18,27,25,0,0,0.80,1.00,5600,8600],
  [7,'谁在纸箱里','path_c',17,24,22,1,0,0.88,1.10,4800,7600],
  [8,'两边都要贴','path_s',18,26,24,2,0,0.84,1.00,5400,8400],
  [9,'箱子排排坐','path_wave',19,28,25,3,0,0.80,1.00,6000,9300],
  [10,'螺旋开箱日','path_spiral',20,30,26,3,0,0.78,0.95,6500,10100],
  [11,'箱里箱外','path_wave',21,31,27,4,0,0.76,0.95,7000,10900],
  [12,'纸箱大收编','path_hook',22,32,28,5,0,0.74,0.95,7600,11800],
  [13,'灰扑扑登场','path_s',19,26,24,0,2,0.86,1.05,5600,8700],
  [14,'猜猜我是谁','path_spiral',20,29,25,0,4,0.82,1.00,6300,9800],
  [15,'扫灰时间','path_wave',21,31,27,0,5,0.79,1.00,6900,10700],
  [16,'箱子沾灰啦','path_hook',22,32,28,2,3,0.77,0.95,7500,11600],
  [17,'看清再发射','path_s',23,34,29,2,4,0.74,0.95,8200,12600],
  [18,'呼噜大扫除','path_spiral',24,36,30,3,5,0.72,0.95,8900,13700],
  [19,'猫步加速','path_wave',24,34,30,2,3,0.74,1.00,8500,13100],
  [20,'钩尾危机','path_hook',25,36,31,3,3,0.71,0.95,9200,14200],
  [21,'五色连环','path_hook',26,38,32,3,4,0.69,0.95,10000,15400],
  [22,'螺旋暴走夜','path_spiral',27,40,34,4,4,0.67,0.90,10800,16600],
  [23,'一窝端走','path_wave',28,42,35,4,5,0.65,0.90,11600,17900],
  [24,'全员回窝','path_hook',29,45,38,5,6,0.63,0.90,12800,19600],
];

const LEVEL_ONE_TYPES: CatType[] = [
  'orange','blue','blue','calico','ragdoll','black','orange','orange','ragdoll',
  'calico','calico','black','blue','ragdoll','ragdoll','black','orange','blue',
];

const LEVEL_ONE_SHOTS: ShotPiece[] = [
  { kind: 'normal', catType: 'blue' },
  { kind: 'normal', catType: 'orange' },
  { kind: 'normal', catType: 'calico' },
  { kind: 'normal', catType: 'ragdoll' },
  { kind: 'normal', catType: 'black' },
  { kind: 'normal', catType: 'orange' },
];

function normal(catType: CatType): PieceSpawnConfig {
  return { kind: 'normal', catType };
}

function makePlan(count: number, seed: number, boxed: number, dusty: number): PieceSpawnConfig[] {
  const plan: PieceSpawnConfig[] = [];
  for (let i = 0; i < count; i++) {
    const catType = CAT_TYPES[(i * 3 + seed) % CAT_TYPES.length];
    plan.push(normal(catType));
  }
  const place = (amount: number, kind: 'boxed' | 'dusty'): void => {
    for (let n = 0; n < amount; n++) {
      const index = Math.min(plan.length - 2, 4 + n * Math.max(5, Math.floor(plan.length / Math.max(1, amount))));
      const hiddenCatType = (plan[index].catType ?? CAT_TYPES[n % 5]) as CatType;
      plan[index] = { kind, catType: null, hiddenCatType, hp: kind === 'boxed' ? 2 : 1 };
    }
  };
  place(boxed, 'boxed');
  place(dusty, 'dusty');
  return plan;
}

export const LEVELS: LevelConfig[] = ROWS.map((row) => {
  const [id, name, pathId, speed, initialCount, waveCount, boxed, dusty, helperStrength, purrMultiplier, score2Star, score3Star] = row;
  const all = makePlan(initialCount + waveCount, id, boxed, dusty);
  const initialPieces = id === 1 ? LEVEL_ONE_TYPES.map(normal) : all.slice(0, initialCount);
  const wavePieces = id === 1 ? makePlan(waveCount, 11, 0, 0) : all.slice(initialCount);
  return {
    id,
    chapter: Math.ceil(id / 6),
    name,
    pathId,
    seed: (0x5EED1234 ^ (id * 2654435761)) >>> 0,
    speed,
    initialPieces,
    wavePieces,
    scriptedShots: id === 1 ? LEVEL_ONE_SHOTS : undefined,
    helperStrength,
    purrMultiplier,
    purrGuaranteeMs: id === 1 ? 30000 : id === 2 ? 45000 : undefined,
    safeClampMs: id === 1 ? 20000 : undefined,
    score2Star,
    score3Star,
    allowedBoosters: id <= 2 ? [] : id < 15 ? ['wand', 'rainbow'] : ['wand', 'catnip', 'rainbow'],
  };
});

