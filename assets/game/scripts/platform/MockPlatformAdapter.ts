import { AdPlacement, AdResult, PlatformAdapter, SafeArea } from './PlatformAdapter';

export class MockPlatformAdapter implements PlatformAdapter {
  private recordStart = 0;

  public getSafeArea(): SafeArea {
    return { top: 88, right: 0, bottom: 64, left: 0 };
  }

  public async vibrate(_kind: 'light' | 'medium'): Promise<void> {}

  public async showRewardedAd(_placement: AdPlacement): Promise<AdResult> {
    return 'completed';
  }

  public async startRecord(): Promise<void> {
    this.recordStart = Date.now();
  }

  public async stopRecord(): Promise<{ durationMs: number; shareable: boolean }> {
    const durationMs = Math.max(0, Date.now() - this.recordStart);
    return { durationMs, shareable: durationMs >= 3000 };
  }

  public async share(_text: string): Promise<boolean> {
    return true;
  }

  public report(event: string, properties: Record<string, string | number | boolean> = {}): void {
    console.info('[analytics]', event, properties);
  }
}

