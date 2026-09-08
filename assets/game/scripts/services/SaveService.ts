import { BoosterType } from '../core/Types';

export interface SaveDataV1 {
  schemaVersion: 1;
  updatedAt: number;
  highestUnlockedLevel: number;
  bestStarsByLevel: Record<string, number>;
  bestScoreByLevel: Record<string, number>;
  fishBalance: number;
  ownedCosmetics: string[];
  equippedCosmetics: { launcher: string; trail: string };
  boosterCounts: Record<BoosterType, number>;
  unlockedCards: string[];
  seenCards: string[];
  settings: { music: boolean; sfx: boolean; vibration: boolean };
  consecutiveFailuresByLevel: Record<string, number>;
  rewardedTransactions: string[];
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const MAIN_KEY = 'miaomiao_home_save_v1';
const BACKUP_KEY = `${MAIN_KEY}_backup`;

export function defaultSave(): SaveDataV1 {
  return {
    schemaVersion: 1,
    updatedAt: Date.now(),
    highestUnlockedLevel: 1,
    bestStarsByLevel: {},
    bestScoreByLevel: {},
    fishBalance: 0,
    ownedCosmetics: ['home_default', 'trail_default'],
    equippedCosmetics: { launcher: 'home_default', trail: 'trail_default' },
    boosterCounts: { wand: 1, catnip: 1, rainbow: 1 },
    unlockedCards: [],
    seenCards: [],
    settings: { music: true, sfx: true, vibration: true },
    consecutiveFailuresByLevel: {},
    rewardedTransactions: [],
  };
}

function checksum(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function encode(data: SaveDataV1): string {
  const payload = JSON.stringify(data);
  return JSON.stringify({ payload, checksum: checksum(payload) });
}

function decode(raw: string | null): SaveDataV1 | null {
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as { payload: string; checksum: number };
    if (checksum(envelope.payload) !== envelope.checksum) return null;
    const data = JSON.parse(envelope.payload) as SaveDataV1;
    return data.schemaVersion === 1 ? data : null;
  } catch {
    return null;
  }
}

export class SaveService {
  public constructor(private readonly storage: KeyValueStorage) {}

  public load(): SaveDataV1 {
    return decode(this.storage.getItem(MAIN_KEY)) ?? decode(this.storage.getItem(BACKUP_KEY)) ?? defaultSave();
  }

  public save(data: SaveDataV1): void {
    const previous = this.storage.getItem(MAIN_KEY);
    if (previous) this.storage.setItem(BACKUP_KEY, previous);
    data.updatedAt = Date.now();
    data.rewardedTransactions = data.rewardedTransactions.slice(-100);
    this.storage.setItem(MAIN_KEY, encode(data));
  }

  public recordWin(data: SaveDataV1, levelId: number, score: number, stars: number): number {
    const key = String(levelId);
    const firstWin = data.bestStarsByLevel[key] === undefined;
    data.bestStarsByLevel[key] = Math.max(data.bestStarsByLevel[key] ?? 0, stars);
    data.bestScoreByLevel[key] = Math.max(data.bestScoreByLevel[key] ?? 0, score);
    data.highestUnlockedLevel = Math.min(24, Math.max(data.highestUnlockedLevel, levelId + 1));
    const reward = 20 + levelId * 2 + stars * 10 + (firstWin ? 30 : 0);
    data.fishBalance += reward;
    data.consecutiveFailuresByLevel[key] = 0;
    this.save(data);
    return reward;
  }
}

