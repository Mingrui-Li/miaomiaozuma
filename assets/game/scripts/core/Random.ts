export class Mulberry32 {
  public constructor(public state: number) {
    this.state >>>= 0;
  }

  public next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public integer(maxExclusive: number): number {
    if (maxExclusive <= 0) throw new Error('maxExclusive must be positive');
    return Math.floor(this.next() * maxExclusive);
  }
}

