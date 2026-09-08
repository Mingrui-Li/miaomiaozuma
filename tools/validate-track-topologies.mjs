import fs from 'node:fs';
import path from 'node:path';

throw new Error('旧 20×5 静态模板检查已废止。请运行 npm run review:tracks；禁止再用旧 PASS 覆盖审核状态。');

const root = process.cwd();
const sourcePath = path.join(root, 'design/track-topologies.source.json');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const { canvas, launcher, defaults } = source;
const TAU = Math.PI * 2;

const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

function pointAt(track, t) {
  if (track.kind === 'sine') {
    let x = track.centerX + track.amplitude * Math.sin(track.phase + TAU * track.cycles * t);
    const y = lerp(track.top, track.bottom, t);
    if (track.mirrorX) x = canvas.width - x;
    return { x, y };
  }
  if (track.kind === 'spline') {
    let controls = track.points.map(([x, y]) => ({ x, y }));
    for (let pass = 0; pass < (track.controlSmooth ?? 0); pass++) {
      controls = controls.map((point, index, all) => {
        if (index === 0 || index === all.length - 1) return point;
        return {
          x: (all[index - 1].x + 2 * point.x + all[index + 1].x) / 4,
          y: (all[index - 1].y + 2 * point.y + all[index + 1].y) / 4
        };
      });
    }
    const extended = [controls[0], controls[0], ...controls, controls.at(-1), controls.at(-1)];
    const segmentCount = extended.length - 3;
    const scaled = t * segmentCount;
    const i = Math.min(segmentCount - 1, Math.floor(scaled));
    const u = scaled - i;
    const p0 = extended[i];
    const p1 = extended[i + 1];
    const p2 = extended[i + 2];
    const p3 = extended[i + 3];
    const u2 = u * u;
    const u3 = u2 * u;
    const b0 = (1 - 3 * u + 3 * u2 - u3) / 6;
    const b1 = (4 - 6 * u2 + 3 * u3) / 6;
    const b2 = (1 + 3 * u + 3 * u2 - 3 * u3) / 6;
    const b3 = u3 / 6;
    let x = p0.x * b0 + p1.x * b1 + p2.x * b2 + p3.x * b3;
    const y = p0.y * b0 + p1.y * b1 + p2.y * b2 + p3.y * b3;
    if (track.mirrorX) x = canvas.width - x;
    return { x, y };
  }
  const theta = track.start + track.direction * TAU * track.turns * t;
  const edgeFade = Math.sin(Math.PI * t);
  const pulse = 1 + track.wave * Math.sin(track.waveCount * theta + track.phase) * edgeFade;
  const rx = lerp(track.outerRx, track.innerRx, t) * pulse;
  const ry = lerp(track.outerRy, track.innerRy, t) * pulse;
  let x = track.centerX + rx * Math.cos(theta) + track.driftX * edgeFade;
  const y = track.centerY + ry * Math.sin(theta) + track.driftY * edgeFade;
  if (track.mirrorX) x = canvas.width - x;
  return { x, y };
}

function hydrate(raw) {
  return { ...defaults, ...raw };
}

function sampleTrack(track) {
  return Array.from({ length: track.samples }, (_, i) => pointAt(track, i / (track.samples - 1)));
}

function segmentIntersects(a, b, c, d) {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return abC * abD < -1e-6 && cdA * cdB < -1e-6;
}

function segmentDistance(a, b, c, d) {
  const pointSegment = (p, u, v) => {
    const vx = v.x - u.x;
    const vy = v.y - u.y;
    const denom = vx * vx + vy * vy;
    const t = denom === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - u.x) * vx + (p.y - u.y) * vy) / denom));
    return Math.hypot(p.x - (u.x + vx * t), p.y - (u.y + vy * t));
  };
  if (segmentIntersects(a, b, c, d)) return 0;
  return Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
}

function curvatureRadius(a, b, c) {
  const ab = dist(a, b);
  const bc = dist(b, c);
  const ca = dist(c, a);
  const area2 = Math.abs(cross(a, b, c));
  if (area2 < 1e-5) return Infinity;
  return (ab * bc * ca) / (2 * area2);
}

function cumulativeLengths(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + dist(points[i - 1], points[i]));
  return lengths;
}

function rayCoverage(points) {
  const step = 2;
  const bins = Array(360 / step).fill(false);
  for (const p of points) {
    const dx = p.x - launcher.x;
    const dy = p.y - launcher.y;
    const radius = Math.hypot(dx, dy);
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const half = Math.asin(Math.min(0.99, 36 / radius)) * 180 / Math.PI;
    for (let a = angle - half; a <= angle + half; a += step / 2) {
      const idx = Math.floor((((a % 360) + 360) % 360) / step);
      bins[idx] = true;
    }
  }
  const quadrants = [false, false, false, false];
  bins.forEach((hit, i) => { if (hit) quadrants[Math.floor((i * step) / 90) % 4] = true; });
  return { degrees: bins.filter(Boolean).length * step, quadrants };
}

function validate(track, points) {
  const errors = [];
  const lengths = cumulativeLengths(points);
  const totalLength = lengths.at(-1);
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const minLauncher = Math.min(...points.map(p => Math.hypot(p.x - launcher.x, p.y - launcher.y)));

  let minCurvature = Infinity;
  let minCurvatureAt = null;
  for (let i = 8; i < points.length - 8; i += 4) {
    const radius = curvatureRadius(points[i - 8], points[i], points[i + 8]);
    if (radius < minCurvature) {
      minCurvature = radius;
      minCurvatureAt = { x: Math.round(points[i].x), y: Math.round(points[i].y), sample: i };
    }
  }

  let selfIntersections = 0;
  let minNonLocal = Infinity;
  const stride = 4;
  for (let i = 0; i < points.length - stride; i += stride) {
    for (let j = i + stride * 2; j < points.length - stride; j += stride) {
      if (lengths[j] - lengths[i] < 240) continue;
      const d = segmentDistance(points[i], points[i + stride], points[j], points[j + stride]);
      minNonLocal = Math.min(minNonLocal, d);
      if (d < 0.5) selfIntersections++;
    }
  }

  const coverage = rayCoverage(points);
  const firstLevel = Number(track.levels.split('-')[0]);
  const requiredCoverage = firstLevel <= 20 ? 220 : firstLevel <= 60 ? 200 : 180;
  if (minX < 52 || maxX > canvas.width - 52 || minY < canvas.playTop + 22 || maxY > canvas.playBottom - 22) errors.push('超出玩法安全区');
  if (minLauncher < launcher.clearance) errors.push('侵入中央发射器禁入区');
  if (minCurvature < 96) errors.push('最小曲率半径不足');
  if (selfIntersections > 0) errors.push('轨道自交');
  if (minNonLocal < 112) errors.push('非相邻轨道间距不足');
  if (coverage.degrees < requiredCoverage) errors.push('总可射角覆盖不足');
  if (!coverage.quadrants.every(Boolean)) errors.push('存在不可射象限');
  if (dist(points[0], points.at(-1)) < 96) errors.push('入口与老巢过近');

  return {
    id: track.id,
    name: track.name,
    levels: track.levels,
    passed: errors.length === 0,
    errors,
    metrics: {
      length: Math.round(totalLength),
      minCurvature: Math.round(minCurvature),
      minCurvatureAt,
      minNonLocal: Math.round(minNonLocal),
      launcherClearance: Math.round(minLauncher),
      rayCoverage: coverage.degrees,
      requiredCoverage,
      quadrants: coverage.quadrants
    },
    source: points[0],
    lair: points.at(-1),
    points: points.filter((_, i) => i % 3 === 0 || i === points.length - 1)
  };
}

function svgAtlas(results) {
  const cardW = 300;
  const cardH = 410;
  const gap = 24;
  const cols = 5;
  const rows = 4;
  const width = 40 + cols * cardW + (cols - 1) * gap + 40;
  const height = 105 + rows * cardH + (rows - 1) * gap + 50;
  const esc = value => String(value).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const body = results.map((r, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const ox = 40 + col * (cardW + gap);
    const oy = 105 + row * (cardH + gap);
    const scale = 0.29;
    const tx = ox + (cardW - canvas.width * scale) / 2;
    const ty = oy - 10;
    const d = r.points.map((p, i) => `${i ? 'L' : 'M'} ${(p.x * scale + tx).toFixed(1)} ${(p.y * scale + ty).toFixed(1)}`).join(' ');
    const source = { x: r.source.x * scale + tx, y: r.source.y * scale + ty };
    const lair = { x: r.lair.x * scale + tx, y: r.lair.y * scale + ty };
    const lc = { x: launcher.x * scale + tx, y: launcher.y * scale + ty };
    const arrow = ratio => {
      const index = Math.min(r.points.length - 2, Math.floor((r.points.length - 1) * ratio));
      const p = r.points[index];
      const q = r.points[index + 1];
      const x = p.x * scale + tx;
      const y = p.y * scale + ty;
      const angle = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      return `<polygon points="-7,-5 8,0 -7,5" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})" fill="#5c5148"/>`;
    };
    const arrows = [0.25, 0.5, 0.75].map(arrow).join('');
    const status = r.passed ? 'PASS' : 'FAIL';
    const color = r.passed ? '#1f7a4d' : '#b42318';
    return `<g>
      <rect x="${ox}" y="${oy}" width="${cardW}" height="${cardH}" rx="18" fill="#fff" stroke="#c9c3ba" stroke-width="2"/>
      <text x="${ox + 18}" y="${oy + 30}" class="title">${r.id} · ${esc(r.name)}</text>
      <text x="${ox + cardW - 18}" y="${oy + 30}" text-anchor="end" class="status" fill="${color}">${status}</text>
      <path d="${d}" fill="none" stroke="#d4c1a0" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="#5c5148" stroke-width="3" stroke-dasharray="8 7" stroke-linecap="round"/>
      ${arrows}
      <circle cx="${source.x}" cy="${source.y}" r="14" fill="#3a8f62" stroke="#fff" stroke-width="3"/>
      <text x="${source.x}" y="${source.y + 4}" text-anchor="middle" class="marker">S</text>
      <circle cx="${lair.x}" cy="${lair.y}" r="14" fill="#b94a3d" stroke="#fff" stroke-width="3"/>
      <text x="${lair.x}" y="${lair.y + 4}" text-anchor="middle" class="marker">L</text>
      <circle cx="${lc.x}" cy="${lc.y}" r="${launcher.clearance * scale}" fill="#fff" stroke="#2563a5" stroke-width="3"/>
      <text x="${lc.x}" y="${lc.y + 5}" text-anchor="middle" class="launcher">360°</text>
      <text x="${ox + 18}" y="${oy + cardH - 50}" class="metric">长度 ${r.metrics.length} · 转弯半径 ${r.metrics.minCurvature} · 中央净距 ${r.metrics.launcherClearance}</text>
      <text x="${ox + 18}" y="${oy + cardH - 24}" class="metric">轨距 ${r.metrics.minNonLocal} · 可射角 ${r.metrics.rayCoverage}° / ${r.metrics.requiredCoverage}°</text>
    </g>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f3efe7"/>
  <style>.heading{font:700 30px sans-serif;fill:#312d29}.sub{font:16px sans-serif;fill:#665f57}.title{font:700 15px sans-serif;fill:#312d29}.status{font:700 13px sans-serif}.marker{font:700 11px sans-serif;fill:#fff}.launcher{font:700 12px sans-serif;fill:#2563a5}.metric{font:12px sans-serif;fill:#665f57}</style>
  <text x="40" y="44" class="heading">《喵喵回窝》20 条轨道拓扑验收图</text>
  <text x="40" y="76" class="sub">S = 唯一迷路入口 · 虚线方向 S→L · 360° = 中央发射器 · L = 唯一单入口老巢 · 仅逻辑拓扑，不是 UI 稿</text>
  ${body}
</svg>`;
}

function svgTemplate(result) {
  const d = result.points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const arrow = ratio => {
    const index = Math.min(result.points.length - 2, Math.floor((result.points.length - 1) * ratio));
    const p = result.points[index];
    const q = result.points[index + 1];
    const angle = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
    return `<polygon points="-16,-11 18,0 -16,11" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${angle.toFixed(1)})" fill="#5c5148"/>`;
  };
  const arrows = [0.16, 0.32, 0.48, 0.64, 0.80].map(arrow).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1334" viewBox="0 0 750 1334">
  <rect width="750" height="1334" fill="#f7f4ee"/>
  <rect y="190" width="750" height="970" fill="#ffffff"/>
  <text x="42" y="72" style="font:700 30px sans-serif;fill:#312d29">${result.id} / LEVELS ${result.levels}</text>
  <text x="42" y="112" style="font:18px sans-serif;fill:#665f57">ONE-WAY TRACK: SOURCE TO LAIR</text>
  <path d="${d}" fill="none" stroke="#d4c1a0" stroke-width="92" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${d}" fill="none" stroke="#5c5148" stroke-width="7" stroke-dasharray="18 14" stroke-linecap="round"/>
  ${arrows}
  <circle cx="${launcher.x}" cy="${launcher.y}" r="${launcher.clearance}" fill="#fff" stroke="#2563a5" stroke-width="8"/>
  <text x="${launcher.x}" y="${launcher.y + 9}" text-anchor="middle" style="font:700 26px sans-serif;fill:#2563a5">360° SHOOTER</text>
  <circle cx="${result.source.x}" cy="${result.source.y}" r="42" fill="#3a8f62" stroke="#fff" stroke-width="7"/>
  <text x="${result.source.x}" y="${result.source.y + 10}" text-anchor="middle" style="font:700 28px sans-serif;fill:#fff">S</text>
  <circle cx="${result.lair.x}" cy="${result.lair.y}" r="42" fill="#bf493d" stroke="#fff" stroke-width="7"/>
  <text x="${result.lair.x}" y="${result.lair.y + 10}" text-anchor="middle" style="font:700 28px sans-serif;fill:#fff">L</text>
  <text x="375" y="1260" text-anchor="middle" style="font:18px sans-serif;fill:#665f57">LOCK TOPOLOGY, ENDPOINTS, DIRECTION AND CENTER SHOOTER</text>
  </svg>`;
}

const results = source.tracks.map(raw => {
  const track = hydrate(raw);
  return validate(track, sampleTrack(track));
});

fs.mkdirSync(path.join(root, 'design/generated'), { recursive: true });
fs.mkdirSync(path.join(root, 'art/topology'), { recursive: true });
fs.mkdirSync(path.join(root, 'art/topology/templates'), { recursive: true });
fs.writeFileSync(path.join(root, 'design/generated/track-topologies.sampled.json'), JSON.stringify({ canvas, launcher, tracks: results }, null, 2));
fs.writeFileSync(path.join(root, 'art/topology/track_topology_atlas.svg'), svgAtlas(results));
for (const result of results) {
  fs.writeFileSync(path.join(root, `art/topology/templates/${result.id.toLowerCase()}.svg`), svgTemplate(result));
}

const rows = results.map(r => `| ${r.id} | ${r.levels} | ${r.passed ? 'PASS' : 'FAIL'} | ${r.metrics.length} | ${r.metrics.minCurvature} | ${r.metrics.minNonLocal} | ${r.metrics.launcherClearance} | ${r.metrics.rayCoverage}° / ${r.metrics.requiredCoverage}° | ${r.errors.join('；') || '—'} |`).join('\n');
const report = `# 轨道拓扑自动验收报告\n\n> 自动生成；源数据：\`design/track-topologies.source.json\`。\n\n| 路径 | 关卡 | 结果 | 长度 | 最小曲率半径 | 最小非相邻轨距 | 中央净距 | 可射角 | 错误 |\n|---|---:|---|---:|---:|---:|---:|---:|---|\n${rows}\n\n总计：${results.filter(r => r.passed).length}/${results.length} 通过。\n`;
fs.writeFileSync(path.join(root, 'docs/TRACK_TOPOLOGY_QA.md'), report);

const failed = results.filter(r => !r.passed);
for (const r of results) {
  console.log(`${r.passed ? 'PASS' : 'FAIL'} ${r.id} length=${r.metrics.length} curvature=${r.metrics.minCurvature} spacing=${r.metrics.minNonLocal} launcher=${r.metrics.launcherClearance} rays=${r.metrics.rayCoverage}/${r.metrics.requiredCoverage}${r.errors.length ? ` :: ${r.errors.join(', ')}` : ''}`);
}
if (failed.length) process.exitCode = 1;
