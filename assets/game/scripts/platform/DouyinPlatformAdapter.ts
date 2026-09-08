import { AdPlacement, AdResult, PlatformAdapter, SafeArea } from './PlatformAdapter';

interface DouyinApi {
  getSystemInfoSync?: () => { safeArea?: { top: number; left: number; right: number; bottom: number }; screenWidth?: number; screenHeight?: number };
  vibrateShort?: (options: { type: string }) => void;
  reportAnalytics?: (event: string, properties: Record<string, unknown>) => void;
}

declare const tt: DouyinApi | undefined;

export class DouyinPlatformAdapter implements PlatformAdapter {
  public getSafeArea(): SafeArea {
    const info = typeof tt !== 'undefined' ? tt.getSystemInfoSync?.() : undefined;
    const area = info?.safeArea;
    if (!area || !info?.screenWidth || !info.screenHeight) return { top: 88, right: 0, bottom: 64, left: 0 };
    return {
      top: area.top,
      left: area.left,
      right: Math.max(0, info.screenWidth - area.right),
      bottom: Math.max(0, info.screenHeight - area.bottom),
    };
  }

  public async vibrate(kind: 'light' | 'medium'): Promise<void> {
    if (typeof tt !== 'undefined') tt.vibrateShort?.({ type: kind });
  }

  public async showRewardedAd(_placement: AdPlacement): Promise<AdResult> {
    // 广告位 ID 必须在抖音开放平台创建后注入，未配置时安全降级。
    return 'unavailable';
  }

  public async startRecord(): Promise<void> {}
  public async stopRecord(): Promise<{ durationMs: number; shareable: boolean }> { return { durationMs: 0, shareable: false }; }
  public async share(_text: string): Promise<boolean> { return false; }

  public report(event: string, properties: Record<string, string | number | boolean> = {}): void {
    if (typeof tt !== 'undefined') tt.reportAnalytics?.(event, properties);
  }
}

