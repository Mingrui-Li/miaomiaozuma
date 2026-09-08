import { CubicSegmentConfig, Vec2Data } from './Types';

export interface PathSample {
  position: Vec2Data;
  tangent: Vec2Data;
  distance: number;
}

export interface Projection {
  distance: number;
  squaredError: number;
  sampleIndex: number;
}

function cubic(segment: CubicSegmentConfig, t: number): Vec2Data {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * segment.p0.x + b * segment.p1.x + c * segment.p2.x + d * segment.p3.x,
    y: a * segment.p0.y + b * segment.p1.y + c * segment.p2.y + d * segment.p3.y,
  };
}

function lerp(a: Vec2Data, b: Vec2Data, t: number): Vec2Data {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function normalize(value: Vec2Data): Vec2Data {
  const length = Math.hypot(value.x, value.y) || 1;
  return { x: value.x / length, y: value.y / length };
}

export class PathSampler {
  public readonly samples: PathSample[];
  public readonly length: number;

  public constructor(segments: CubicSegmentConfig[], spacing = 4) {
    if (segments.length === 0) throw new Error('A path needs at least one segment');
    const rough: Array<{ position: Vec2Data; distance: number }> = [];
    let distance = 0;
    let previous = segments[0].p0;
    rough.push({ position: previous, distance });
    for (const segment of segments) {
      for (let step = 1; step <= 80; step++) {
        const position = cubic(segment, step / 80);
        distance += Math.hypot(position.x - previous.x, position.y - previous.y);
        rough.push({ position, distance });
        previous = position;
      }
    }
    this.length = distance;
    this.samples = [];
    let cursor = 0;
    for (let d = 0; d <= distance; d += spacing) {
      while (cursor + 1 < rough.length && rough[cursor + 1].distance < d) cursor++;
      const left = rough[cursor];
      const right = rough[Math.min(cursor + 1, rough.length - 1)];
      const span = Math.max(0.0001, right.distance - left.distance);
      const position = lerp(left.position, right.position, (d - left.distance) / span);
      const tangent = normalize({ x: right.position.x - left.position.x, y: right.position.y - left.position.y });
      this.samples.push({ position, tangent, distance: d });
    }
    if (this.samples[this.samples.length - 1].distance < distance) {
      const last = rough[rough.length - 1].position;
      const before = this.samples[this.samples.length - 1].position;
      this.samples.push({ position: last, tangent: normalize({ x: last.x - before.x, y: last.y - before.y }), distance });
    }
  }

  public sampleAtDistance(input: number): PathSample {
    const d = Math.max(0, Math.min(this.length, input));
    let low = 0;
    let high = this.samples.length - 1;
    while (low + 1 < high) {
      const mid = (low + high) >> 1;
      if (this.samples[mid].distance <= d) low = mid;
      else high = mid;
    }
    const a = this.samples[low];
    const b = this.samples[high];
    const t = (d - a.distance) / Math.max(0.0001, b.distance - a.distance);
    return { position: lerp(a.position, b.position, t), tangent: normalize(lerp(a.tangent, b.tangent, t)), distance: d };
  }

  public projectPoint(point: Vec2Data, hintIndex?: number): Projection {
    let bestIndex = 0;
    let bestError = Number.POSITIVE_INFINITY;
    const start = hintIndex === undefined ? 0 : Math.max(0, hintIndex - 80);
    const end = hintIndex === undefined ? this.samples.length : Math.min(this.samples.length, hintIndex + 81);
    for (let i = start; i < end; i++) {
      const dx = this.samples[i].position.x - point.x;
      const dy = this.samples[i].position.y - point.y;
      const error = dx * dx + dy * dy;
      if (error < bestError) {
        bestError = error;
        bestIndex = i;
      }
    }
    if (hintIndex !== undefined && bestError > 96 * 96) return this.projectPoint(point);
    return { distance: this.samples[bestIndex].distance, squaredError: bestError, sampleIndex: bestIndex };
  }
}

