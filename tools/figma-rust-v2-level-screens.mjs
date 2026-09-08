#!/usr/bin/env node

import './track-review/block-legacy-figma.mjs';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import readline from 'node:readline';

const ROOT = process.cwd();
const BINARY = '/Users/limingrui/.codex/tools/figma-mcp-rust/0.2.0/node_modules/@alvinindra/figma-mcp-rust/bin/darwin-x64/figma-mcp-rust';
const SECTION_ID = '362:538';
const TRACK_BOARD = 'MMHW/V2/10_Track_Vector_Masters';
const ASSET_BOARD = 'MMHW/V2/11_Level_Asset_Bank';
const LEVEL_BOARD = 'MMHW/V2/12_100_Level_Screens';
const chapter = Number(process.argv.find((arg) => arg.startsWith('--chapter='))?.split('=')[1] ?? 1);
const replaceChapter = process.argv.includes('--replace');
if (!Number.isInteger(chapter) || chapter < 1 || chapter > 10) throw new Error('--chapter must be 1..10');

const sampled = JSON.parse(await readFile(`${ROOT}/design/generated/track-topologies.sampled.json`, 'utf8'));
const chapterNames = ['春日小院', '薰衣草花园', '玻璃花房', '海风露台', '金秋果园', '月夜灯会', '暖冬雪庭', '樱花坡道', '落日屋顶', '星光庆典'];
const catTypes = ['orange', 'ragdoll', 'blue', 'calico', 'black'];
const colors = {
  ink: '#4B382F', muted: '#725C50', wood: '#A9632F', woodDark: '#63381F',
  cream: '#FFF4D8', cream2: '#FFF9EC', coral: '#FF7468', coralDark: '#D94F42',
  mint: '#67CCAA', purple: '#8467B3', gold: '#FFD65A', white: '#FFFFFF',
};

const child = spawn(BINARY, ['--ip', '127.0.0.1', '--port', '1994'], { stdio: ['pipe', 'pipe', 'inherit'] });
const pending = new Map();
let nextId = 1;
const lines = readline.createInterface({ input: child.stdout });
lines.on('line', (line) => {
  try {
    const message = JSON.parse(line);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  } catch {}
});
function rpc(method, params = {}) {
  const id = nextId++;
  const promise = new Promise((resolve) => pending.set(id, resolve));
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  return promise;
}
function parse(response) {
  const result = response?.result;
  if (!result || result.isError) throw new Error(result?.content?.[0]?.text ?? JSON.stringify(response));
  const raw = result.content?.[0]?.text ?? '{}';
  try { return JSON.parse(raw); } catch { return { text: raw }; }
}
async function call(name, args = {}) { return parse(await rpc('tools/call', { name, arguments: args })); }
function idOf(value) {
  const keys = ['id', 'nodeId', 'clonedNodeId', 'createdNodeId', 'frameId', 'groupId'];
  for (const key of keys) if (typeof value?.[key] === 'string') return value[key];
  for (const key of ['node', 'createdNode', 'clonedNode', 'frame', 'group']) {
    if (typeof value?.[key]?.id === 'string') return value[key].id;
  }
  throw new Error(`No node ID returned: ${JSON.stringify(value)}`);
}
async function frame(parentId, name, x, y, width, height, fillColor) {
  return idOf(await call('create_frame', { parentId, name, x, y, width, height, fillColor }));
}
async function rect(parentId, name, x, y, width, height, fillColor, radius = 0) {
  return idOf(await call('create_rectangle', { parentId, name, x, y, width, height, fillColor, cornerRadius: radius }));
}
async function ellipse(parentId, name, x, y, width, height, fillColor) {
  return idOf(await call('create_ellipse', { parentId, name, x, y, width, height, fillColor }));
}
async function text(parentId, name, value, x, y, size, color = colors.ink, style = 'Semibold') {
  return idOf(await call('create_text', { parentId, name, text: value, x, y, fontSize: size, fillColor: color, fontFamily: 'PingFang SC', fontStyle: style }));
}
function estimatedTextWidth(value, size) {
  return [...value].reduce((sum, char) => sum + (/^[\x00-\xff]$/.test(char) ? size * 0.58 : size), 0);
}
async function centerText(parentId, name, value, centerX, y, size, color = colors.ink, style = 'Semibold') {
  return text(parentId, name, value, centerX - estimatedTextWidth(value, size) / 2, y, size, color, style);
}
async function clone(nodeId, parentId, x, y, width, height, name) {
  const cloned = idOf(await call('clone_node', { nodeId, parentId, x, y }));
  if (width || height) await call('resize_nodes', { nodeIds: [cloned], ...(width ? { width } : {}), ...(height ? { height } : {}) });
  if (name) await call('rename_node', { nodeId: cloned, name });
  return cloned;
}
async function stroke(nodeId, color, weight) { await call('set_strokes', { nodeId, color, strokeWeight: weight }); }

function indexByName(result) {
  const nodes = result.nodes ?? result.results ?? result.matchedNodes ?? result.items
    ?? Object.values(result).find((value) => Array.isArray(value)) ?? [];
  return new Map(nodes.map((node) => [node.name, node.id]));
}
async function findExact(parentId, name) {
  const result = await call('search_nodes', { query: name, nodeId: parentId, limit: 50 });
  const match = (result.nodes ?? result.results ?? []).find((node) => node.name === name);
  return match?.id;
}
function screenPoints(track) { return track.points.map((point) => ({ x: point.x * 0.5, y: point.y * 0.5 })); }
function pathLengths(points) {
  const values = [0];
  for (let i = 1; i < points.length; i++) values.push(values.at(-1) + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  return values;
}
function pointAtDistance(points, lengths, target) {
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < target) i++;
  const span = Math.max(0.0001, lengths[i] - lengths[i - 1]);
  const t = Math.max(0, Math.min(1, (target - lengths[i - 1]) / span));
  return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * t, y: points[i - 1].y + (points[i].y - points[i - 1].y) * t };
}
function geometryBounds(track) {
  const points = screenPoints(track);
  return { x: Math.min(...points.map((p) => p.x)) - 31, y: Math.min(...points.map((p) => p.y)) - 31 };
}
function obstacleType(level, index) {
  if (index < 3 || index % 5 !== 2) return null;
  if (level >= 11 && level <= 20) return 'cardboard';
  if (level >= 21 && level <= 30) return 'dust';
  if (level >= 31) return ((level + index) % 2 ? 'cardboard' : 'dust');
  return null;
}

async function topHud(screenId, assets, level, variant) {
  await rect(screenId, 'HUD/Pause/Shadow', 12, 19, 45, 45, '#6A4227AA', 15);
  const pause = await rect(screenId, 'HUD/Pause/Body', 12, 15, 45, 45, colors.cream2, 15);
  await stroke(pause, '#D99650', 2);
  await centerText(screenId, 'HUD/Pause/Icon', 'Ⅱ', 34.5, 24, 18, colors.woodDark);
  await rect(screenId, 'HUD/Level/Shadow', 112, 20, 151, 48, colors.woodDark, 18);
  const board = await rect(screenId, 'HUD/Level/Board', 112, 15, 151, 48, colors.wood, 18);
  await stroke(board, '#F2B667', 2);
  await rect(screenId, 'HUD/Level/Gloss', 124, 21, 127, 8, '#FFFFFF55', 4);
  await centerText(screenId, 'HUD/Level/Text', `第${level}关`, 187.5, 27, 18, colors.cream2);
  await rect(screenId, 'HUD/Fish/Shadow', 292, 19, 71, 43, '#6A4227AA', 16);
  const fish = await rect(screenId, 'HUD/Fish/Body', 292, 15, 71, 43, colors.cream2, 16);
  await stroke(fish, '#D99650', 2);
  await clone(assets.get('Asset/Icon/fish'), screenId, 299, 25, 21, 21, 'HUD/Fish/Icon');
  await centerText(screenId, 'HUD/Fish/Value', String((level - 1) * 12), 343, 27, 14, colors.ink);
  await rect(screenId, 'HUD/Purr/Shadow', 44, 76, 287, 21, '#603B25AA', 11);
  await rect(screenId, 'HUD/Purr/Track', 46, 73, 283, 20, colors.cream2, 10);
  await rect(screenId, 'HUD/Purr/Fill', 50, 77, 118 + variant * 20, 12, colors.purple, 6);
  await rect(screenId, 'HUD/Purr/Gloss', 53, 79, 109 + variant * 20, 3, '#FFFFFF88', 2);
  await centerText(screenId, 'HUD/Purr/Label', '呼噜值', 187.5, 96, 10, '#FFF9EC');
}

async function boosterDock(screenId, assets, level) {
  const specs = [
    ['wand', colors.purple, 17],
    ['catnip', colors.mint, 140],
    ['rainbow', colors.coral, 263],
  ];
  for (let i = 0; i < specs.length; i++) {
    const [asset, color, x] = specs[i];
    await rect(screenId, `Booster/${asset}/Shadow`, x, 596, 96, 62, '#5B3B28AA', 21);
    const body = await rect(screenId, `Booster/${asset}/Body`, x, 590, 96, 62, color, 21);
    await stroke(body, '#FFF1C9', 2);
    await rect(screenId, `Booster/${asset}/Gloss`, x + 9, 597, 78, 8, '#FFFFFF55', 4);
    await clone(assets.get(`Asset/Icon/${asset}`), screenId, x + 16, 599, 42, 42, `Booster/${asset}/Icon`);
    await ellipse(screenId, `Booster/${asset}/Count`, x + 65, 621, 24, 24, colors.cream2);
    await centerText(screenId, `Booster/${asset}/CountText`, level < 4 ? '3' : '2', x + 77, 626, 12, colors.woodDark);
  }
}

async function createLevel(chapterFrameId, assets, tracks, level, column) {
  const topologyIndex = Math.floor((level - 1) / 5);
  const track = sampled.tracks[topologyIndex];
  const topology = track.id;
  const variant = (level - 1) % 5 + 1;
  const screen = await frame(chapterFrameId, `MMHW/V2/Level/${String(level).padStart(3, '0')} · ${topology}/V${variant}`, 40 + column * 420, 40, 375, 667, '#BFE9F4');
  await call('set_corner_radius', { nodeIds: [screen], cornerRadius: 18 });
  await clone(assets.get(`Asset/Background/C${String(chapter).padStart(2, '0')}`), screen, 0, 0, 375, 667, `Background/Image2/C${String(chapter).padStart(2, '0')}`);
  await rect(screen, 'Background/ReadabilityVeil', 0, 0, 375, 667, '#FFF9E818', 0);

  const bounds = geometryBounds(track);
  await clone(tracks.get(`Track/Geometry/${topology}`), screen, bounds.x, bounds.y, undefined, undefined, `Track/Exact/${topology}`);

  const points = screenPoints(track);
  const lengths = pathLengths(points);
  const maxByLength = Math.max(10, Math.floor((lengths.at(-1) - 120) / 35));
  const visibleCount = Math.min(12 + variant + Math.min(chapter - 1, 5), maxByLength, 22);
  for (let i = 0; i < visibleCount; i++) {
    const point = pointAtDistance(points, lengths, 55 + i * 35);
    const obstacle = obstacleType(level, i);
    if (obstacle) {
      await clone(assets.get(`Asset/Obstacle/${obstacle === 'cardboard' ? 'CardboardCat' : 'DustCat'}`), screen, point.x - 20, point.y - 20, 40, 40, `Chain/${String(i + 1).padStart(2, '0')}/Obstacle/${obstacle}`);
    } else {
      const type = catTypes[(i + level - 1) % catTypes.length];
      await clone(assets.get(`Asset/Cat/${type}`), screen, point.x - 19, point.y - 19, 38, 38, `Chain/${String(i + 1).padStart(2, '0')}/Cat/${type}`);
    }
  }

  const start = { x: track.source.x * 0.5, y: track.source.y * 0.5 };
  const end = { x: track.lair.x * 0.5, y: track.lair.y * 0.5 };
  await clone(assets.get('Asset/Endpoint/Source'), screen, start.x - 38, start.y - 38, 76, 76, 'Endpoint/Source/Image2');
  await clone(assets.get('Asset/Endpoint/Lair'), screen, end.x - 36, end.y - 36, 72, 72, 'Endpoint/Lair/Image2');
  const ring = await ellipse(screen, 'Launcher/AimRing360', 124.5, 274.5, 126, 126, '#FFF6C755');
  await stroke(ring, '#FFF0B8', 2);
  for (const [x, y] of [[181, 270], [181, 397], [117, 334], [245, 334]]) await ellipse(screen, 'Launcher/AimDot', x, y, 13, 13, '#FFF7DDBB');
  await clone(assets.get('Asset/Launcher/Center360'), screen, 139.5, 289.5, 96, 96, 'Launcher/Center360/Image2');
  await rect(screen, 'Launcher/Badge', 159, 383, 57, 22, '#6D4A35CC', 11);
  await centerText(screen, 'Launcher/BadgeText', '360°', 187.5, 387, 11, colors.white);

  const currentType = catTypes[(level + 1) % catTypes.length];
  await ellipse(screen, 'Launcher/Next/Shadow', 307, 514, 51, 51, '#5C3B2888');
  await ellipse(screen, 'Launcher/Next/Body', 307, 510, 51, 51, colors.cream2);
  await clone(assets.get(`Asset/Cat/${currentType}`), screen, 313, 516, 39, 39, `Launcher/Next/${currentType}`);
  await centerText(screen, 'Launcher/Next/Label', '下一只', 332.5, 565, 10, colors.cream2, 'Regular');

  if (level <= 3) {
    await rect(screen, 'Tutorial/HintPill', 91, 112, 193, 34, '#FFF9ECD9', 17);
    await centerText(screen, 'Tutorial/Hint', ['认准出口，猫猫只往老巢走', '拖动瞄准，可射向四面八方', '点下一只可以交换'][level - 1], 187.5, 121, 12, colors.ink, 'Regular');
  }
  if (level >= 41) {
    await clone(assets.get('Asset/Status/SpeedWave'), screen, 316, 108, 38, 38, 'Status/SpeedWave/Image2');
  }
  await topHud(screen, assets, level, variant);
  await boosterDock(screen, assets, level);
  return screen;
}

async function main() {
  await new Promise((resolve) => setTimeout(resolve, 9000));
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'codex-miaomiaozuma-v2-level-screens', version: '1.0.0' } });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);

  const trackBoardId = await findExact(SECTION_ID, TRACK_BOARD);
  const assetBoardId = await findExact(SECTION_ID, ASSET_BOARD);
  if (!trackBoardId || !assetBoardId) throw new Error('Track or asset board missing');
  const assets = indexByName(await call('scan_nodes_by_types', { nodeId: assetBoardId, types: ['RECTANGLE'] }));
  const tracks = indexByName(await call('scan_nodes_by_types', { nodeId: trackBoardId, types: ['GROUP'] }));
  for (const required of ['Asset/Background/C01', 'Asset/Cat/orange', 'Asset/Endpoint/Source', 'Asset/Endpoint/Lair', 'Asset/Launcher/Center360', 'Asset/Icon/wand']) {
    if (!assets.has(required)) throw new Error(`Missing asset node ${required}`);
  }

  let boardId = await findExact(SECTION_ID, LEVEL_BOARD);
  let createdBoard = false;
  if (!boardId) {
    boardId = await frame(SECTION_ID, LEVEL_BOARD, 80, 9400, 4250, 7480, '#F5EADB');
    createdBoard = true;
    await call('set_corner_radius', { nodeIds: [boardId], cornerRadius: 32 });
    await text(boardId, 'Board/Title', '12 · 100关完整游戏界面（V2）', 34, 22, 32);
    await text(boardId, 'Board/Rule', '每关均锁定：唯一出口、连续轨道、正中央 360° 发射器、唯一老巢；猫咪坐标由轨道弧长计算，不允许脱轨。', 34, 65, 15, colors.muted, 'Regular');
  }

  const chapterName = `MMHW/V2/Chapter/${String(chapter).padStart(2, '0')} · ${chapterNames[chapter - 1]}`;
  let priorChapter = await findExact(boardId, chapterName);
  if (priorChapter && replaceChapter) {
    await call('delete_nodes', { nodeIds: [priorChapter] });
    priorChapter = undefined;
  }
  if (priorChapter) {
    await call('save_screenshots', { items: [{ nodeId: priorChapter, outputPath: `art/qa/figma-v2-chapter-${String(chapter).padStart(2, '0')}.png`, format: 'PNG', scale: 0.45 }] });
    console.log(JSON.stringify({ status: 'exists', chapter, chapterFrameId: priorChapter }));
    return;
  }

  let chapterFrameId;
  const createdScreens = [];
  try {
    chapterFrameId = await frame(boardId, chapterName, 0, 90 + (chapter - 1) * 735, 4250, 720, chapter % 2 ? '#FFF8E9' : '#F0F6E4');
    await text(chapterFrameId, 'Chapter/Title', `第${chapter}章 · ${chapterNames[chapter - 1]} · 第${(chapter - 1) * 10 + 1}–${chapter * 10}关`, 40, 12, 16, colors.ink);
    for (let column = 0; column < 10; column++) {
      const level = (chapter - 1) * 10 + column + 1;
      const screenId = await createLevel(chapterFrameId, assets, tracks, level, column);
      createdScreens.push(screenId);
      console.log(`FIGMA_LEVEL chapter=${chapter} ${column + 1}/10 level=${level} node=${screenId}`);
    }
    const sectionInfo = await call('get_node', { nodeId: SECTION_ID });
    const sectionWidth = sectionInfo.width ?? sectionInfo.node?.width ?? 9200;
    const sectionHeight = sectionInfo.height ?? sectionInfo.node?.height ?? 9300;
    await call('resize_nodes', { nodeIds: [SECTION_ID], width: Math.max(9200, sectionWidth), height: Math.max(17000, sectionHeight) });
    const items = [{ nodeId: chapterFrameId, outputPath: `art/qa/figma-v2-chapter-${String(chapter).padStart(2, '0')}.png`, format: 'PNG', scale: 0.45 }];
    if (chapter === 1) {
      items.push({ nodeId: createdScreens[0], outputPath: 'art/qa/figma-v2-level-001.png', format: 'PNG', scale: 1.5 });
      items.push({ nodeId: createdScreens[9], outputPath: 'art/qa/figma-v2-level-010.png', format: 'PNG', scale: 1.5 });
    }
    await call('save_screenshots', { items });
    console.log(JSON.stringify({ status: 'created', chapter, chapterFrameId, screens: createdScreens }, null, 2));
  } catch (error) {
    if (chapterFrameId) {
      try { await call('delete_nodes', { nodeIds: [chapterFrameId] }); } catch {}
    } else if (createdBoard && boardId) {
      try { await call('delete_nodes', { nodeIds: [boardId] }); } catch {}
    }
    throw error;
  }
}

main().then(() => child.kill('SIGTERM')).catch((error) => {
  console.error(error);
  child.kill('SIGTERM');
  process.exitCode = 1;
});
