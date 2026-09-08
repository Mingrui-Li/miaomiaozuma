#!/usr/bin/env node

import './track-review/block-legacy-figma.mjs';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import readline from 'node:readline';

const ROOT = process.cwd();
const BINARY = '/Users/limingrui/.codex/tools/figma-mcp-rust/0.2.0/node_modules/@alvinindra/figma-mcp-rust/bin/darwin-x64/figma-mcp-rust';
const SECTION_ID = '362:538';
const BOARD_NAME = 'MMHW/V2/10_Track_Vector_Masters';
const SCREEN_SCALE = 0.5;
const TRACK_SAMPLES = 28;
const replaceExisting = process.argv.includes('--replace');

const source = JSON.parse(await readFile(`${ROOT}/design/generated/track-topologies.sampled.json`, 'utf8'));
const chapterNames = [
  '春日小院', '薰衣草花园', '玻璃花房', '海风露台', '金秋果园',
  '月夜灯会', '暖冬雪庭', '樱花坡道', '落日屋顶', '星光庆典',
];

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

async function call(name, args = {}) {
  return parse(await rpc('tools/call', { name, arguments: args }));
}

function idOf(value) {
  const id = value?.id ?? value?.nodeId ?? value?.node?.id ?? value?.createdNode?.id ?? value?.group?.id;
  if (!id) throw new Error(`No node ID returned: ${JSON.stringify(value)}`);
  return id;
}

const imageCache = new Map();
async function imageData(path) {
  if (!imageCache.has(path)) imageCache.set(path, (await readFile(`${ROOT}/${path}`)).toString('base64'));
  return imageCache.get(path);
}

async function frame(parentId, name, x, y, width, height, fillColor) {
  return idOf(await call('create_frame', { parentId, name, x, y, width, height, fillColor }));
}

async function ellipse(parentId, name, x, y, size, fillColor) {
  return idOf(await call('create_ellipse', { parentId, name, x, y, width: size, height: size, fillColor }));
}

async function rect(parentId, name, x, y, width, height, fillColor, cornerRadius = 0) {
  return idOf(await call('create_rectangle', { parentId, name, x, y, width, height, fillColor, cornerRadius }));
}

async function text(parentId, name, value, x, y, size, color = '#4B382F', style = 'Semibold') {
  return idOf(await call('create_text', {
    parentId, name, text: value, x, y, fontSize: size, fillColor: color,
    fontFamily: 'PingFang SC', fontStyle: style,
  }));
}

async function image(parentId, name, path, x, y, width, height, scaleMode = 'FIT') {
  return idOf(await call('import_image', {
    parentId, name, imageData: await imageData(path), x, y, width, height, scaleMode,
  }));
}

function resample(points, count) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths.at(-1) + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = lengths.at(-1);
  const result = [];
  let cursor = 1;
  for (let i = 0; i < count; i++) {
    const target = total * i / (count - 1);
    while (cursor < lengths.length - 1 && lengths[cursor] < target) cursor++;
    const a = points[cursor - 1];
    const b = points[cursor];
    const span = Math.max(0.0001, lengths[cursor] - lengths[cursor - 1]);
    const t = (target - lengths[cursor - 1]) / span;
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return result;
}

async function createTrackGeometry(viewportId, track) {
  const points = resample(track.points, TRACK_SAMPLES).map((point) => ({
    x: point.x * SCREEN_SCALE,
    y: point.y * SCREEN_SCALE,
  }));
  const nodes = [];
  const layers = [
    { name: 'WoodEdge', size: 58, color: '#9A5D2C' },
    { name: 'CreamPath', size: 43, color: '#FFE7B3' },
  ];
  for (const layer of layers) {
    for (let i = 0; i < points.length - 1; i++) {
      const point = points[i];
      const next = points[i + 1];
      const length = Math.hypot(next.x - point.x, next.y - point.y) + 5;
      const midpoint = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
      const segment = await rect(
        viewportId,
        `Track/${track.id}/${layer.name}/${String(i + 1).padStart(2, '0')}`,
        midpoint.x - length / 2,
        midpoint.y - layer.size / 2,
        length,
        layer.size,
        layer.color,
        layer.size / 2,
      );
      await call('rotate_nodes', { nodeIds: [segment], rotation: Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI });
      nodes.push(segment);
    }
  }
  const grouped = await call('group_nodes', { nodeIds: nodes, name: `Track/Geometry/${track.id}` });
  return { groupId: idOf(grouped), points };
}

async function createMaster(boardId, track, index) {
  const col = index % 5;
  const row = Math.floor(index / 5);
  const card = await frame(boardId, `MMHW/V2/TrackMaster/${track.id}`, 34 + col * 405, 126 + row * 756, 375, 730, '#ECF5D8');
  await call('set_corner_radius', { nodeIds: [card], cornerRadius: 24 });
  await text(card, 'Header/ID', `${track.id} · ${track.name}`, 16, 12, 16);
  await text(card, 'Header/Levels', `关卡 ${track.levels} · ${chapterNames[Math.floor(index / 2)]}`, 16, 35, 12, '#7A6254', 'Regular');

  const viewport = await frame(card, `Viewport/${track.id}`, 0, 55, 375, 667, '#F7F4E8');
  const geometry = await createTrackGeometry(viewport, track);
  const start = track.source;
  const end = track.lair;
  const sourceSize = 72;
  const lairSize = 68;
  const launcherSize = 92;
  await image(viewport, 'Endpoint/Source/Image2', 'art/imagegen/components/source.png', start.x * SCREEN_SCALE - sourceSize / 2, start.y * SCREEN_SCALE - sourceSize / 2, sourceSize, sourceSize);
  await image(viewport, 'Endpoint/Lair/Image2', 'art/imagegen/components/lair.png', end.x * SCREEN_SCALE - lairSize / 2, end.y * SCREEN_SCALE - lairSize / 2, lairSize, lairSize);
  await image(viewport, 'Launcher/Center360/Image2', 'art/imagegen/components/launcher.png', source.launcher.x * SCREEN_SCALE - launcherSize / 2, source.launcher.y * SCREEN_SCALE - launcherSize / 2, launcherSize, launcherSize);
  await text(viewport, 'Direction/Rule', '猫链：出口 → 老巢', 123, 629, 12, '#5D473B', 'Semibold');
  return { cardId: card, viewportId: viewport, geometryId: geometry.groupId };
}

async function main() {
  await new Promise((resolve) => setTimeout(resolve, 9000));
  await rpc('initialize', {
    protocolVersion: '2025-03-26', capabilities: {},
    clientInfo: { name: 'codex-miaomiaozuma-v2-track-masters', version: '1.0.0' },
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);

  const duplicate = await call('search_nodes', { query: BOARD_NAME, nodeId: SECTION_ID, limit: 10 });
  const matches = duplicate.nodes ?? duplicate.results ?? [];
  const exact = matches.find((node) => node.name === BOARD_NAME);
  if (exact && !replaceExisting) {
    await call('save_screenshots', { items: [{ nodeId: exact.id, outputPath: 'art/qa/figma-v2-track-masters.png', format: 'PNG', scale: 0.35 }] });
    console.log(JSON.stringify({ status: 'exists', boardId: exact.id }));
    return;
  }
  if (exact && replaceExisting) await call('delete_nodes', { nodeIds: [exact.id] });

  let boardId;
  try {
    boardId = await frame(SECTION_ID, BOARD_NAME, 80, 6000, 2090, 3170, '#F5EADB');
    await call('set_corner_radius', { nodeIds: [boardId], cornerRadius: 32 });
    await text(boardId, 'Board/Title', '10 · 100关精确轨道母版', 34, 24, 32);
    await text(boardId, 'Board/Rule', '唯一出口 S → 单条连续开放轨道 → 唯一老巢 L；发射器固定正中央并支持 360° 发射。', 34, 70, 16, '#7A6254', 'Regular');

    const masters = {};
    for (let i = 0; i < source.tracks.length; i++) {
      const track = source.tracks[i];
      masters[track.id] = await createMaster(boardId, track, i);
      console.log(`FIGMA_TRACK ${i + 1}/20 ${track.id} ${masters[track.id].geometryId}`);
    }

    const sectionInfo = await call('get_node', { nodeId: SECTION_ID });
    const width = sectionInfo.width ?? sectionInfo.node?.width ?? 9200;
    const height = sectionInfo.height ?? sectionInfo.node?.height ?? 5800;
    await call('resize_nodes', { nodeIds: [SECTION_ID], width: Math.max(9200, width), height: Math.max(9300, height) });
    await call('save_screenshots', { items: [{ nodeId: boardId, outputPath: 'art/qa/figma-v2-track-masters.png', format: 'PNG', scale: 0.35 }] });
    console.log(JSON.stringify({ status: 'created', boardId, masters }, null, 2));
  } catch (error) {
    if (boardId) {
      try { await call('delete_nodes', { nodeIds: [boardId] }); } catch {}
    }
    throw error;
  }
}

main()
  .then(() => child.kill('SIGTERM'))
  .catch((error) => {
    console.error(error);
    child.kill('SIGTERM');
    process.exitCode = 1;
  });
