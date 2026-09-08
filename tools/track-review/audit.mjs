import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { makePath, parameterize, at, resample, distance, radius, segmentDistance, makeCats, visibleState, gapWitness } from './geometry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const input = fs.readFileSync(path.join(root, 'design/track-review/levels.json'), 'utf8');
const source = JSON.parse(input);
const out = path.join(root, 'design/track-review/generated');
const paths = source.levels.map(level => parameterize(makePath(level.geometry)));
const round = x => Number(x.toFixed(1));

// Shape comparison permits translation, uniform scale, rotation, reflection and
// reverse traversal. Reversing or mirroring alone cannot earn a new level slot.
export function shapeDifference(pathA, pathB) {
  const sample = p => Array.from({ length: 101 }, (_, i) => at(p, p.length * i / 100));
  const centered = pts => {
    const center = { x: pts.reduce((v, p) => v + p.x, 0) / pts.length, y: pts.reduce((v, p) => v + p.y, 0) / pts.length };
    return pts.map(p => ({ x: p.x - center.x, y: p.y - center.y }));
  };
  const a = centered(sample(pathA)), originalB = centered(sample(pathB));
  let best = Infinity;
  for (const flip of [1, -1]) for (const reverse of [false, true]) {
    const b = (reverse ? [...originalB].reverse() : originalB).map(p => ({ x: p.x * flip, y: p.y }));
    let real = 0, imaginary = 0, norm = 0;
    for (let i = 0; i < a.length; i++) { real += a[i].x * b[i].x + a[i].y * b[i].y; imaginary += a[i].y * b[i].x - a[i].x * b[i].y; norm += b[i].x ** 2 + b[i].y ** 2; }
    const r = real / norm, im = imaginary / norm;
    const error = a.reduce((sum, p, i) => sum + (p.x - (r * b[i].x - im * b[i].y)) ** 2 + (p.y - (im * b[i].x + r * b[i].y)) ** 2, 0);
    best = Math.min(best, Math.sqrt(error / a.length));
  }
  return best;
}

const pairs = [];
for (let a = 0; a < paths.length; a++) for (let b = a + 1; b < paths.length; b++) {
  const rms = Math.min(shapeDifference(paths[a], paths[b]), shapeDifference(paths[b], paths[a]));
  pairs.push({ a: source.levels[a].id, b: source.levels[b].id, rms: round(rms), reviewRequired: rms < 48 });
}

const levels = source.levels.map((level, index) => {
  const p = paths[index], pts = resample(p, 4), step = p.length / (pts.length - 1);
  const failures = [];
  let minRadius = Infinity, minSeparation = Infinity, intersections = 0;
  // C1 primitive joins are exact; this numeric sample also covers analytic curves.
  for (let i = 3; i < pts.length - 3; i++) minRadius = Math.min(minRadius, radius(pts[i - 3], pts[i], pts[i + 3]));
  for (let i = 0; i < pts.length - 1; i++) for (let j = i + 2; j < pts.length - 1; j++) {
    const sep = segmentDistance(pts[i], pts[i + 1], pts[j], pts[j + 1]);
    // Intersection is checked even for local segments, unlike the old validator.
    if (sep < 1e-6) intersections++;
    if ((j - i - 1) * step >= 240) minSeparation = Math.min(minSeparation, sep);
  }
  const clearance = Math.min(...pts.map(pt => distance(pt, source.launcher)));
  if (pts.some(pt => pt.x < 52 || pt.x > 698 || pt.y < 212 || pt.y > 1138)) failures.push('中心线越出安全区');
  if (clearance < 108) failures.push('中央禁入区不足 108px');
  if (minRadius < 95.5) failures.push('曲率半径不足 96px（数值容差 0.5px）');
  if (minSeparation < 112) failures.push('非相邻段净距不足 112px');
  if (intersections) failures.push('有自交或重合段');
  if (distance(pts[0], pts.at(-1)) < 112) failures.push('入口与老巢过近');
  const states = [0.45, 0.72, 0.94].map(headRatio => {
    const cats = makeCats(p, headRatio), vis = visibleState(source.launcher, cats);
    const witness = gapWitness(source.launcher, cats);
    const head = cats.at(-1);
    return { headRatio, catCount: cats.length, directlyHittable: vis.first.size, completelyHidden: vis.hidden.size, coveredDegrees: vis.covered, headVisible: vis.first.has(head.id), gapWitness: witness };
  });
  const full = visibleState(source.launcher, makeCats(p, 0.995));
  if (full.covered < 220) failures.push('满链诊断的角覆盖不足 220°');
  const quadrants = [false, false, false, false];
  for (const pt of pts) quadrants[Math.floor(((Math.atan2(pt.y - 675, pt.x - 375) * 180 / Math.PI + 360) % 360) / 90)] = true;
  if (!quadrants.every(Boolean)) failures.push('有象限没有轨道');
  if (level.focus === 'gap' && !states.some(s => s.gapWitness)) failures.push('缺少可复现的穿缝探针证据');
  const similar = pairs.filter(pair => (pair.a === level.id || pair.b === level.id) && pair.reviewRequired);
  const sourceDir = at(p, 10), lairDir = at(p, p.length - 10);
  return {
    id: level.id, name: level.name, family: level.family,
    geometryPassed: failures.length === 0, failures,
    similarityReview: similar, status: 'DRAFT_NOT_GAMEPLAY_APPROVED',
    metrics: { length: round(p.length), minRadius: round(minRadius), minSeparation: round(minSeparation), launcherClearance: round(clearance), intersections, fullFixtureCoverage: full.covered },
    endpoints: { source: pts[0], sourceAngle: Math.atan2(sourceDir.y - pts[0].y, sourceDir.x - pts[0].x), lair: pts.at(-1), lairAngle: Math.atan2(pts.at(-1).y - lairDir.y, pts.at(-1).x - lairDir.x) },
    states
  };
});

const report = {
  sourceSha256: crypto.createHash('sha256').update(input).digest('hex'),
  schemaVersion: 1, status: 'LOGIC_REVIEW_ONLY',
  scope: '10 条候选路径的几何 + 三个静态满尾链快照 + 三猫探针移除前后首撞对照。不是完整游戏模拟，不验证通关率、30 秒暴走、受控生成、移动中碰撞、回吸时间或真实玩家体验。',
  similarityThreshold: 48,
  similarityCaveat: '去平移/等比缩放/旋转/镜像/倒序后，等弧长对应点 RMS 小于 48px 必须复审；高于阈值也不代表玩法有趣。',
  levels, pairs: pairs.sort((a, b) => a.rms - b.rms)
};
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'audit.json'), JSON.stringify(report, null, 2) + '\n');
const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const tiles = levels.map((level, i) => {
  const p = paths[i], points = resample(p, 8), x = 24 + (i % 5) * 246, y = 116 + Math.floor(i / 5) * 440, k = .29;
  const d = points.map((pt, j) => `${j ? 'L' : 'M'} ${pt.x} ${pt.y}`).join(' ');
  const arrows = [.04, .25, .5, .75, .96].map(f => { const a = at(p, p.length * f), b = at(p, p.length * f + 5); return `<path d="M -13 -12 L 13 0 L -13 12" fill="none" stroke="#374151" stroke-width="6" transform="translate(${a.x} ${a.y}) rotate(${Math.atan2(b.y - a.y,b.x-a.x)*180/Math.PI})"/>`; }).join('');
  const marker = (pt, text, fill) => `<circle cx="${pt.x}" cy="${pt.y}" r="30" fill="${fill}" stroke="white" stroke-width="5"/><text x="${pt.x}" y="${pt.y+10}" text-anchor="middle" font-size="30" fill="white">${text}</text>`;
  return `<g transform="translate(${x} ${y})"><rect width="230" height="422" rx="12" fill="white" stroke="#d1d5db"/><text x="14" y="27" font-size="17" font-weight="700">${String(level.id).padStart(2, '0')} ${esc(level.name)}</text><text x="14" y="49" font-size="12" fill="#475569">${esc(level.family)}</text><g transform="translate(6 -2) scale(${k})"><path d="${d}" fill="none" stroke="#e2e8f0" stroke-width="88" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#94a3b8" stroke-width="3" stroke-dasharray="9 10"/>${arrows}<circle cx="375" cy="675" r="108" fill="none" stroke="#94a3b8" stroke-dasharray="10 8" stroke-width="3"/><circle cx="375" cy="675" r="57" fill="#263954"/><text x="375" y="686" text-anchor="middle" font-size="30" fill="white">360°</text>${marker(points[0], 'S', '#05766b')}${marker(points.at(-1), 'L', '#b53838')}</g><text x="14" y="371" font-size="12">长度 ${level.metrics.length} · 最小转弯 ${level.metrics.minRadius}</text><text x="14" y="393" font-size="12" fill="${level.geometryPassed ? '#05766b' : '#b53838'}">${level.geometryPassed ? '几何/探针通过 · 玩法待验收' : esc(level.failures.join('；'))}</text></g>`;
}).join('');
fs.writeFileSync(path.join(out, 'first-ten-atlas.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="1262" height="1010" viewBox="0 0 1262 1010"><rect width="100%" height="100%" fill="#f5f7fa"/><g font-family="sans-serif"><text x="24" y="40" font-size="25" font-weight="700">喵喵回窝 · 前十关轨道逻辑候选</text><text x="24" y="69" font-size="16">S 唯一入口 → 箭头方向 → L 唯一老巢；中央 360° 发射。灰盒，不是美术稿。</text><text x="24" y="94" font-size="14" fill="#9b341b">仅做几何与首撞诊断，尚未证明可通关；ImageGen / Figma / Cocos 继续暂停。</text>${tiles}</g></svg>`);
const lines = ['# 前十关轨道诊断记录', '', `输入 SHA-256：\`${report.sourceSha256}\``, '', report.scope, '', '## 几何与探针', '', '| 关 | 形态 | 长度 | 最小半径 | 非邻段距 | 中央净距 | 遮挡状态数 / 3 | 开缝证据数 / 3 | 几何/探针 |', '|---:|---|---:|---:|---:|---:|---:|---:|---|', ...levels.map(l => `| ${l.id} | ${l.family} | ${l.metrics.length} | ${l.metrics.minRadius} | ${l.metrics.minSeparation} | ${l.metrics.launcherClearance} | ${l.states.filter(s => s.completelyHidden).length} | ${l.states.filter(s => s.gapWitness).length} | ${l.geometryPassed ? '通过' : l.failures.join('；')} |`), '', '## 形态去重', '', report.similarityCaveat, '', '| 最相似关卡对（前十对） | RMS px | 复审 |', '|---|---:|---|', ...report.pairs.slice(0,10).map(p => `| ${p.a} / ${p.b} | ${p.rms} | ${p.reviewRequired ? '需要，不得算独立通过' : '不触发阈值，仍需人工体验'} |`), '', '## 未完成的验收', '', '- 十条路径的真实受控生成计划、插入、动态回吸与连锁试玩。', '- 每关 500 种子的完整游戏模拟和真实玩家体验。', '- 11～100 关的独立路线、逐关决策和以上全部证据。', '- 100 关全量逻辑验收、ImageGen、Figma 逐关复现、用户验收以及 Cocos 重构。', ''];
fs.writeFileSync(path.join(out, 'AUDIT.md'), lines.join('\n'));
console.log(JSON.stringify({ report: path.relative(root, path.join(out, 'AUDIT.md')), sourceSha256: report.sourceSha256, levels: levels.map(l => ({ id: l.id, pass: l.geometryPassed, failures: l.failures })), similarPairs: report.pairs.filter(p => p.reviewRequired) }, null, 2));
if (levels.some(l => !l.geometryPassed) || report.pairs.some(p => p.reviewRequired)) process.exitCode = 1;
