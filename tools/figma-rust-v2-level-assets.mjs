#!/usr/bin/env node

import './track-review/block-legacy-figma.mjs';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import readline from 'node:readline';

const ROOT = process.cwd();
const BINARY = '/Users/limingrui/.codex/tools/figma-mcp-rust/0.2.0/node_modules/@alvinindra/figma-mcp-rust/bin/darwin-x64/figma-mcp-rust';
const SECTION_ID = '362:538';
const BOARD_NAME = 'MMHW/V2/11_Level_Asset_Bank';

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
  const id = value?.id ?? value?.nodeId ?? value?.node?.id ?? value?.createdNode?.id;
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
async function text(parentId, name, value, x, y, size, color = '#4B382F', style = 'Semibold') {
  return idOf(await call('create_text', { parentId, name, text: value, x, y, fontSize: size, fillColor: color, fontFamily: 'PingFang SC', fontStyle: style }));
}
async function image(parentId, name, path, x, y, width, height, scaleMode = 'FIT') {
  return idOf(await call('import_image', { parentId, name, imageData: await imageData(path), x, y, width, height, scaleMode }));
}

const backgrounds = [
  ['C01', '春日小院', 'art/imagegen/backgrounds/c01-spring-courtyard.png'],
  ['C02', '薰衣草花园', 'art/imagegen/backgrounds/c02-lavender-garden.png'],
  ['C03', '玻璃花房', 'art/imagegen/backgrounds/c03-greenhouse.png'],
  ['C04', '海风露台', 'art/imagegen/backgrounds/c04-seaside.png'],
  ['C05', '金秋果园', 'art/imagegen/backgrounds/c05-autumn-orchard.png'],
  ['C06', '月夜灯会', 'art/imagegen/backgrounds/c06-moonlit-lantern.png'],
  ['C07', '暖冬雪庭', 'art/imagegen/backgrounds/c07-winter.png'],
  ['C08', '樱花坡道', 'art/imagegen/backgrounds/c08-sakura.png'],
  ['C09', '落日屋顶', 'art/imagegen/backgrounds/c09-rooftop-sunset.png'],
  ['C10', '星光庆典', 'art/imagegen/backgrounds/c10-starlit-festival.png'],
];
const cats = ['orange', 'ragdoll', 'blue', 'calico', 'black'];

async function main() {
  await new Promise((resolve) => setTimeout(resolve, 9000));
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'codex-miaomiaozuma-v2-assets', version: '1.0.0' } });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
  const duplicate = await call('search_nodes', { query: BOARD_NAME, nodeId: SECTION_ID, limit: 10 });
  const exact = (duplicate.nodes ?? duplicate.results ?? []).find((node) => node.name === BOARD_NAME);
  if (exact) {
    await call('save_screenshots', { items: [{ nodeId: exact.id, outputPath: 'art/qa/figma-v2-level-assets.png', format: 'PNG', scale: 0.5 }] });
    console.log(JSON.stringify({ status: 'exists', boardId: exact.id }));
    return;
  }

  let boardId;
  try {
    boardId = await frame(SECTION_ID, BOARD_NAME, 2300, 6000, 2100, 830, '#F5EADB');
    await call('set_corner_radius', { nodeIds: [boardId], cornerRadius: 32 });
    await text(boardId, 'Board/Title', '11 · GPT Image 2.0 关卡资产库', 34, 24, 32);
    await text(boardId, 'Board/Rule', '背景、角色、端点、发射器、障碍与道具均为独立图层；关卡 UI 和文字仍保持 Figma 可编辑。', 34, 68, 15, '#7A6254', 'Regular');
    const ids = {};
    for (let i = 0; i < backgrounds.length; i++) {
      const [code, label, path] = backgrounds[i];
      const col = i % 5;
      const row = Math.floor(i / 5);
      ids[`background_${code}`] = await image(boardId, `Asset/Background/${code}`, path, 34 + col * 190, 112 + row * 310, 170, 270, 'FILL');
      await text(boardId, `Label/Background/${code}`, `${code} · ${label}`, 36 + col * 190, 388 + row * 310, 12, '#4B382F', 'Regular');
      console.log(`FIGMA_ASSET background ${i + 1}/10 ${code}`);
    }
    for (let i = 0; i < cats.length; i++) {
      const type = cats[i];
      ids[`cat_${type}`] = await image(boardId, `Asset/Cat/${type}`, `assets/resources/game/cats/cat_${type}.png`, 1035 + i * 132, 116, 104, 104);
    }
    ids.source = await image(boardId, 'Asset/Endpoint/Source', 'art/imagegen/components/source.png', 1030, 276, 180, 180);
    ids.lair = await image(boardId, 'Asset/Endpoint/Lair', 'art/imagegen/components/lair.png', 1250, 276, 180, 180);
    ids.launcher = await image(boardId, 'Asset/Launcher/Center360', 'art/imagegen/components/launcher.png', 1470, 276, 180, 180);
    ids.cardboard = await image(boardId, 'Asset/Obstacle/CardboardCat', 'art/imagegen/obstacles/cardboard-cat.png', 1035, 520, 104, 104);
    ids.dust = await image(boardId, 'Asset/Obstacle/DustCat', 'art/imagegen/obstacles/dust-cat.png', 1167, 520, 104, 104);
    ids.speed = await image(boardId, 'Asset/Status/SpeedWave', 'art/imagegen/obstacles/speed-wave.png', 1299, 520, 104, 104);
    const boosters = [
      ['wand', 'art/final/icons/icon_wand.png'],
      ['catnip', 'art/final/icons/icon_catnip.png'],
      ['rainbow', 'art/final/icons/icon_rainbow.png'],
      ['fish', 'art/final/icons/icon_fish.png'],
    ];
    for (let i = 0; i < boosters.length; i++) {
      const [name, path] = boosters[i];
      ids[name] = await image(boardId, `Asset/Icon/${name}`, path, 1480 + i * 112, 528, 88, 88);
    }
    await text(boardId, 'Label/Endpoints', '出口 Source        老巢 Lair        中央 360° 发射器', 1040, 466, 13, '#4B382F', 'Regular');
    await text(boardId, 'Label/Obstacles', '纸箱猫       灰扑扑猫       速度波          三种道具 / 鱼干', 1040, 638, 13, '#4B382F', 'Regular');
    await call('save_screenshots', { items: [{ nodeId: boardId, outputPath: 'art/qa/figma-v2-level-assets.png', format: 'PNG', scale: 0.5 }] });
    console.log(JSON.stringify({ status: 'created', boardId, ids }, null, 2));
  } catch (error) {
    if (boardId) {
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
