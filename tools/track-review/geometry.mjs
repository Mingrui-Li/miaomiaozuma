// Diagnostic geometry only. This module is not included in the Cocos runtime.
export const TAU = Math.PI * 2;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const vector = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
const unit = v => { const d = Math.hypot(v.x, v.y); return { x: v.x / d, y: v.y / d }; };
const cross = (a, b) => a.x * b.y - a.y * b.x;
const dot = (a, b) => a.x * b.x + a.y * b.y;
const add = (p, v, s) => ({ x: p.x + v.x * s, y: p.y + v.y * s });

export function roundedPath(g) {
  const p = g.points.map(([x, y]) => ({ x, y }));
  const bends = p.slice(1, -1).map((b, i) => {
    const u = unit(vector(p[i], b)), v = unit(vector(b, p[i + 2]));
    const turn = Math.atan2(cross(u, v), dot(u, v));
    const trim = g.radius * Math.tan(Math.abs(turn) / 2);
    const start = add(b, u, -trim), end = add(b, v, trim);
    const center = add(start, { x: -u.y, y: u.x }, Math.sign(turn) * g.radius);
    return { start, end, center, turn, trim, angle: Math.atan2(start.y - center.y, start.x - center.x) };
  });
  for (let i = 0; i < p.length - 1; i++) {
    if ((bends[i - 1]?.trim ?? 0) + (bends[i]?.trim ?? 0) > distance(p[i], p[i + 1]) + 1e-6) {
      throw new Error(`圆角重叠：线段 ${i} 太短，禁止自动缩小半径掩盖错误`);
    }
  }
  const result = [p[0]];
  const line = to => { const from = result.at(-1), n = Math.ceil(distance(from, to) / 2); for (let i = 1; i <= n; i++) result.push(mix(from, to, i / n)); };
  for (const b of bends) {
    line(b.start);
    const n = Math.ceil(Math.abs(b.turn) * g.radius / 2);
    for (let j = 1; j <= n; j++) {
      const angle = b.angle + b.turn * j / n;
      result.push({ x: b.center.x + Math.cos(angle) * g.radius, y: b.center.y + Math.sin(angle) * g.radius });
    }
  }
  line(p.at(-1));
  return result;
}

export function makePath(g) {
  if (g.kind === 'authored-points') return g.points.map(([x,y])=>({x,y}));
  if (g.kind === 'warped') {
    const p=parameterize(makePath(g.base));
    const points=Array.from({length:1201},(_,i)=>at(p,p.length*(g.from+(g.to-g.from)*i/1200)));
    return points.map(p=>{
      const x=p.x-375,y=p.y-675;
      return {x:375+x*g.sx+g.dx+g.bendX*Math.sin(y/435*Math.PI)+g.skewX*y/435,
        y:675+y*g.sy+g.dy+g.bendY*Math.sin(x/315*Math.PI)+g.skewY*x/315};
    });
  }
  if (g.kind === 'rounded') return roundedPath(g);
  const points = Array.from({ length: 1801 }, (_, i) => {
    const t = i / 1800;
    if (g.kind === 'sine') return { x: g.centerX + g.amplitude * Math.sin(g.phase + TAU * g.cycles * t), y: g.top + (g.bottom - g.top) * t };
    if (g.kind !== 'spiral' && g.kind !== 'contour-spiral') throw new Error(`Unknown geometry ${g.kind}`);
    const a = g.start + TAU * g.turns * t;
    const pulse = 1 + g.wave * Math.sin(g.lobes * a) * Math.sin(Math.PI * t);
    const n=g.exponent??2;
    const contour=g.kind==='contour-spiral'?(Math.abs(Math.cos(a))**n+Math.abs(Math.sin(a))**n)**(-1/n):1;
    return { x: 375 + (g.rx0 + (g.rx1 - g.rx0) * t) * pulse * contour * Math.cos(a), y: 675 + (g.ry0 + (g.ry1 - g.ry0) * t) * pulse * contour * Math.sin(a) };
  });
  return points;
}

export function parameterize(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + distance(points[i - 1], points[i]));
  return { points, lengths, length: lengths.at(-1) };
}
export function at(path, s) {
  s = clamp(s, 0, path.length);
  let lo = 0, hi = path.lengths.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (path.lengths[mid] <= s) lo = mid; else hi = mid; }
  const span = path.lengths[hi] - path.lengths[lo];
  return mix(path.points[lo], path.points[hi], span > 1e-8 ? (s - path.lengths[lo]) / span : 0);
}
export function resample(path, step = 4) {
  const n = Math.ceil(path.length / step);
  return Array.from({ length: n + 1 }, (_, i) => at(path, path.length * i / n));
}
export function segmentDistance(a, b, c, d) {
  const ab = vector(a, b), cd = vector(c, d);
  const denominator = cross(ab, cd);
  if (Math.abs(denominator) > 1e-9) {
    const ac = vector(a, c), t = cross(ac, cd) / denominator, u = cross(ac, ab) / denominator;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
  }
  const ps = (p, a, b) => { const v = vector(a, b); return distance(p, add(a, v, clamp(dot(vector(a, p), v) / (dot(v, v) || 1), 0, 1))); };
  return Math.min(ps(a, c, d), ps(b, c, d), ps(c, a, b), ps(d, a, b));
}
export function radius(a, b, c) {
  const area = Math.abs(cross(vector(a, b), vector(a, c)));
  return area < 1e-7 ? Infinity : distance(a, b) * distance(b, c) * distance(c, a) / (2 * area);
}

// Swept circle / stationary cat: Minkowski radius = projectile radius + cat radius.
// The empty path is deliberately absent from this collision query.
export function rayHits(origin, angle, cats, combinedRadius = 62) {
  const v = { x: Math.cos(angle), y: Math.sin(angle) };
  return cats.flatMap(cat => {
    const delta = vector(origin, cat), along = dot(delta, v);
    const perpendicularSq = dot(delta, delta) - along * along;
    if (perpendicularSq > combinedRadius * combinedRadius + 1e-8) return [];
    const half = Math.sqrt(Math.max(0, combinedRadius * combinedRadius - perpendicularSq));
    if (along + half < 0) return [];
    return [{ cat, t: Math.max(0, along - half), point: add(origin, v, Math.max(0, along - half)) }];
  }).sort((a, b) => a.t - b.t || a.cat.id - b.cat.id);
}

export function makeCats(path, headRatio, spacing = 66, catRadius = 32) {
  const head = Math.min(path.length - catRadius, path.length * headRatio);
  // Static stress fixture, NOT the spawn plan or full-game difficulty simulation.
  const n = Math.max(0, Math.floor(head / spacing) + 1);
  return Array.from({ length: n }, (_, id) => {
    const s = head - (n - 1 - id) * spacing;
    return { ...at(path, s), s, id, color: Math.floor(id / 2) % 5 };
  });
}

export function visibleState(origin, cats, combinedRadius = 62) {
  const first = new Set(), all = new Set();
  const firstBins = new Map();
  let covered = 0;
  for (let degrees = 0; degrees < 360; degrees += 0.5) {
    const hits = rayHits(origin, degrees * Math.PI / 180, cats, combinedRadius);
    for (const hit of hits) all.add(hit.cat.id);
    if (!hits.length) continue;
    covered += 0.5; first.add(hits[0].cat.id);
    firstBins.set(hits[0].cat.id, (firstBins.get(hits[0].cat.id) ?? 0) + 0.5);
  }
  return { first, hidden: new Set([...all].filter(id => !first.has(id))), firstBins, covered };
}

export function gapWitness(origin, cats, combinedRadius = 62) {
  const before = visibleState(origin, cats, combinedRadius);
  let best = null;
  for (let i = 0; i < cats.length - 2; i++) {
    const group = cats.slice(i, i + 3);
    if (!group.some(c => before.first.has(c.id))) continue;
    const removed = new Set(group.map(c => c.id));
    const after = visibleState(origin, cats.filter(c => !removed.has(c.id)), combinedRadius);
    const newlyVisible = [...after.first].filter(id => before.hidden.has(id));
    if (newlyVisible.length && (!best || newlyVisible.length > best.newlyVisible.length)) {
      const remaining = cats.filter(c => !removed.has(c.id));
      let angleDegrees = null;
      for (let degrees = 0; degrees < 360; degrees += .5) {
        if (rayHits(origin, degrees * Math.PI / 180, remaining, combinedRadius)[0]?.cat.id === newlyVisible[0]) { angleDegrees = degrees; break; }
      }
      best = { removed: [...removed], newlyVisible, angleDegrees };
    }
  }
  return best;
}
