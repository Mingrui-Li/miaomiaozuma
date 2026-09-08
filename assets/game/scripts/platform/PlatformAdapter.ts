export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type AdPlacement = 'revive' | 'double_reward';
export type AdResult = 'completed' | 'cancelled' | 'unavailable' | 'failed';

export interface PlatformAdapter {
  getSafeArea(): SafeArea;
  vibrate(kind: 'light' | 'medium'): Promise<void>;
  showRewardedAd(placement: AdPlacement): Promise<AdResult>;
  startRecord(): Promise<void>;
  stopRecord(): Promise<{ durationMs: number; shareable: boolean }>;
  share(text: string): Promise<boolean>;
  report(event: string, properties?: Record<string, string | number | boolean>): void;
}

