#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import readline from 'node:readline';

const binary = '/Users/limingrui/.codex/tools/figma-mcp-rust/0.2.0/node_modules/@alvinindra/figma-mcp-rust/bin/darwin-x64/figma-mcp-rust';
const SECTION_ID = '362:538';
const FONT = 'WenYuan Rounded SC VF';
const child = spawn(binary, ['--ip', '127.0.0.1', '--port', '1994'], { stdio: ['pipe', 'pipe', 'ignore'] });
const pending = new Map();
let nextId = 1;
const lines = readline.createInterface({ input: child.stdout });
lines.on('line', (line) => {
  try {
    const message = JSON.parse(line);
    if (message.id && pending.has(message.id.id)) return;
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  } catch {}
});

function rpc(method, params = {}) {
  const constId = nextId++;
  const promise = new Promise((resolve) => pending.set(constId, resolve));
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: constId, method, params })}\n`);
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
  return value?.id ?? value?.nodeId ?? value?.node?.id ?? value?.createdNode?.id;
}

const C = {
  sky: '#BFE9F4', cream: '#FFF4D8', cream2: '#FFF9EC', grass: '#B9D982',
  ink: '#4A2B1F', muted: '#765C4C', wood: '#A95F2B', wood2: '#C87A37', woodDark: '#5F301A',
  orange: '#FFA33E', coral: '#FF654F', coralDark: '#D84638', mint: '#69D5AE',
  mintDark: '#359B78', blue: '#72BDEA', purple: '#8A62C1', purpleDark: '#684693',
  gold: '#FFD65A', white: '#FFFFFF', disabled: '#BEB5AC', danger: '#ED685C',
  night: '#3E365C', lock: '#837A74', panel: '#FFF7E2', lime: '#9DDA70',
};

const CAT_LABELS = {
  orange: '橘团', ragdoll: '雪团', blue: '蓝莓', calico: '花卷', black: '煤球', unknown: '未解锁',
};
const CAT_TYPES = ['orange', 'ragdoll', 'blue', 'calico', 'black'];
const imageCache = new Map();

async function imageData(path) {
  if (!imageCache.has(path)) imageCache.set(path, (await readFile(path)).toString('base64'));
  return imageCache.get(path);
}

async function frame(parentId, name, x, y, width, height, fillColor = C.cream2) {
  return idOf(await call('create_frame', { parentId, name, x, y, width, height, fillColor }));
}

async function rect(parentId, name, x, y, width, height, fillColor, radius = 0) {
  return idOf(await call('create_rectangle', { parentId, name, x, y, width, height, fillColor, cornerRadius: radius }));
}

async function ellipse(parentId, name, x, y, width, height, fillColor) {
  return idOf(await call('create_ellipse', { parentId, name, x, y, width, height, fillColor }));
}

async function image(parentId, name, path, x, y, width, height, scaleMode = 'FIT') {
  return idOf(await call('import_image', {
    parentId, name, imageData: await imageData(path), x, y, width, height, scaleMode,
  }));
}

async function rawText(parentId, name, value, x, y, size, color = C.ink, style = 'Regular') {
  return call('create_text', {
    parentId, name, text: value, x, y, fontSize: size, fillColor: color, fontFamily: FONT, fontStyle: style,
  });
}

async function text(parentId, name, value, x, y, size, color = C.ink, style = 'Regular') {
  return idOf(await rawText(parentId, name, value, x, y, size, color, style));
}

async function centerText(parentId, name, value, centerX, centerY, size, color = C.ink, style = 'SemiBold') {
  const created = await rawText(parentId, name, value, 0, 0, size, color, style);
  const nodeId = idOf(created);
  const bounds = created.bounds ?? created.node?.bounds ?? { width: value.length * size, height: size * 1.35 };
  await call('move_nodes', { nodeIds: [nodeId], x: centerX - bounds.width / 2, y: centerY - bounds.height / 2 });
  return nodeId;
}

async function shadow(nodeId, opacity = 0.2, y = 5, radius = 8, color = C.woodDark) {
  await call('set_effects', {
    nodeId,
    effects: [{ type: 'DROP_SHADOW', color, opacity, offsetX: 0, offsetY: y, radius, spread: 0 }],
  });
}

async function stroke(nodeId, color = C.woodDark, weight = 2) {
  await call('set_strokes', { nodeId, color, strokeWeight: weight });
}

async function roundedFrame(parentId, name, x, y, width, height, fillColor, radius = 24) {
  const id = await frame(parentId, name, x, y, width, height, fillColor);
  await call('set_corner_radius', { nodeIds: [id], cornerRadius: radius });
  return id;
}

const catPath = (type) => `assets/game/art/cats/cat_${type}.png`;
const iconPath = (name) => `art/final/icons/icon_${name}.png`;

async function cat(parentId, name, type, x, y, size, opacity = 1) {
  const id = await image(parentId, name, catPath(type), x, y, size, size, 'FIT');
  if (opacity !== 1) await call('set_opacity', { nodeIds: [id], opacity });
  return id;
}

async function icon(parentId, name, type, x, y, size) {
  return image(parentId, name, iconPath(type), x, y, size, size, 'FIT');
}

async function gloss(parentId, name, x, y, width) {
  return rect(parentId, `${name}/Gloss`, x + 12, y + 7, width - 24, 7, '#FFFFFF66', 4);
}

async function glossyButton(parentId, name, label, x, y, width, height = 56, color = C.coral, dark = C.coralDark, disabled = false) {
  await rect(parentId, `${name}/Shadow`, x, y + 6, width, height, dark, height / 2);
  const body = await rect(parentId, `${name}/Body`, x, y, width, height, color, height / 2);
  await stroke(body, disabled ? '#DFD6CD' : '#FFD39A', 2);
  await gloss(parentId, name, x, y, width);
  await centerText(parentId, `${name}/LabelShadow`, label, x + width / 2, y + height / 2 + 2, height * 0.36, disabled ? '#877D75' : C.woodDark, 'SemiBold');
  await centerText(parentId, `${name}/Label`, label, x + width / 2, y + height / 2, height * 0.36, disabled ? '#F4EFE9' : C.cream2, 'SemiBold');
  return body;
}

async function creamPill(parentId, name, x, y, width, height = 42) {
  await rect(parentId, `${name}/Shadow`, x, y + 4, width, height, C.woodDark, height / 2);
  const body = await rect(parentId, `${name}/Body`, x, y, width, height, C.cream, height / 2);
  await stroke(body, '#C98242', 2);
  return body;
}

async function woodTitle(parentId, name, label, x, y, width, height = 60, fontSize = 29) {
  await rect(parentId, `${name}/Shadow`, x, y + 7, width, height, C.woodDark, 21);
  const outer = await rect(parentId, `${name}/Outer`, x, y, width, height, C.wood, 21);
  await stroke(outer, '#EFAC5B', 3);
  await rect(parentId, `${name}/Inner`, x + 7, y + 7, width - 14, height - 14, '#B96D31', 16);
  await centerText(parentId, `${name}/TextShadow`, label, x + width / 2, y + height / 2 + 2, fontSize, C.woodDark, 'ExtraBold');
  await centerText(parentId, `${name}/Text`, label, x + width / 2, y + height / 2, fontSize, C.cream, 'ExtraBold');
  return outer;
}

async function logoBoard(parentId, x, y, width = 230, height = 154) {
  await rect(parentId, 'Brand/Shadow', x, y + 10, width, height, C.woodDark, 34);
  const board = await rect(parentId, 'Brand/Wood', x, y, width, height, '#97511F', 34);
  await stroke(board, '#ECA351', 4);
  await rect(parentId, 'Brand/Inner', x + 10, y + 10, width - 20, height - 20, '#B7692B', 27);
  await centerText(parentId, 'Brand/TextShadow', '喵喵\n回窝', x + width / 2, y + height / 2 + 3, 47, C.woodDark, 'ExtraBold');
  await centerText(parentId, 'Brand/Text', '喵喵\n回窝', x + width / 2, y + height / 2, 47, C.cream, 'ExtraBold');
  for (const [dx, dy, w, h] of [[-16, 22, 30, 14], [width - 8, 39, 28, 14], [15, height - 6, 30, 14]]) {
    const leaf = await ellipse(parentId, 'Brand/Leaf', x + dx, y + dy, w, h, '#78B94C');
    await call('rotate_nodes', { nodeIds: [leaf], rotation: dx < 0 ? -35 : 28 });
  }
  return board;
}

async function currencyPill(parentId, name, x, y, value = '128', width = 92, height = 40) {
  const body = await creamPill(parentId, name, x, y, width, height);
  await icon(parentId, `${name}/Fish`, 'fish', x + 8, y + 5, height - 10);
  await centerText(parentId, `${name}/Value`, value, x + width * 0.69, y + height / 2, height * 0.38, C.ink, 'SemiBold');
  return body;
}

async function iconButton(parentId, name, iconName, x, y, size = 44, color = C.cream) {
  const body = await creamPill(parentId, name, x, y, size, size);
  if (['settings', 'map', 'collection', 'cosmetic'].includes(iconName)) {
    await icon(parentId, `${name}/Icon`, iconName, x + 7, y + 7, size - 14);
  } else {
    const glyph = iconName === 'pause' ? 'Ⅱ' : iconName === 'back' ? '‹' : '×';
    await centerText(parentId, `${name}/Icon`, glyph, x + size / 2, y + size / 2 - 1, size * 0.48, C.woodDark, 'ExtraBold');
  }
  return body;
}

async function screenBase(sectionId, name, x, y, background = 'home') {
  const screen = await frame(sectionId, `MMHW/V2/${name}`, x, y, 375, 667, C.sky);
  await image(screen, 'Background/Scene', background === 'gameplay' ? 'art/final/gameplay_background.png' : 'art/final/home_background.png', 0, 0, 375, 667, 'FILL');
  return screen;
}

async function softVeil(parentId, color = '#FFF8EAB8') {
  return rect(parentId, 'Background/SoftVeil', 0, 0, 375, 667, color, 0);
}

async function topHud(parentId, level = 1) {
  const pause = await iconButton(parentId, 'HUD/Pause', 'pause', 14, 14, 43);
  await woodTitle(parentId, 'HUD/Level', `第${level}关`, 111, 12, 153, 52, 25);
  const fish = await currencyPill(parentId, 'HUD/Fish', 293, 14, '0', 68, 43);
  await rect(parentId, 'HUD/Purr/Shadow', 51, 75, 288, 22, C.woodDark, 11);
  const track = await rect(parentId, 'HUD/Purr/Track', 53, 73, 284, 20, C.cream2, 10);
  await stroke(track, '#E8A64F', 2);
  await rect(parentId, 'HUD/Purr/Fill', 57, 77, 177, 12, C.purple, 6);
  await rect(parentId, 'HUD/Purr/Glow', 61, 79, 167, 4, '#FFFFFF88', 2);
  const badge = await ellipse(parentId, 'HUD/Purr/Badge', 30, 68, 33, 33, C.purple);
  await stroke(badge, C.gold, 2);
  await centerText(parentId, 'HUD/Purr/Paw', '●', 46.5, 84.5, 18, '#F3C2F5', 'ExtraBold');
  return { pause, fish };
}

async function navButton(parentId, name, label, iconName, x, selected = false) {
  const body = await rect(parentId, `${name}/Shadow`, x, 584, 105, 55, selected ? C.woodDark : '#7C4425', 22);
  const face = await rect(parentId, `${name}/Body`, x, 579, 105, 55, selected ? C.gold : C.cream, 22);
  await stroke(face, '#D78A3B', 2);
  await icon(parentId, `${name}/Icon`, iconName, x + 12, 588, 31);
  await centerText(parentId, `${name}/Label`, label, x + 71, 606, 16, C.ink, 'SemiBold');
  return face;
}

async function createLoading(sectionId, x, y) {
  const screen = await screenBase(sectionId, 'P00 启动与合规', x, y);
  await softVeil(screen, '#FFF8EA8A');
  await logoBoard(screen, 72, 79, 231, 158);
  const types = ['orange', 'ragdoll', 'blue', 'calico', 'black'];
  for (let i = 0; i < types.length; i++) await cat(screen, `Loading/Cat/${types[i]}`, types[i], 42 + i * 58, 276 + (i % 2) * 6, 62);
  await rect(screen, 'Loading/Track', 48, 449, 279, 24, '#FFFFFFDD', 12);
  await rect(screen, 'Loading/Fill', 52, 453, 196, 16, C.orange, 8);
  await rect(screen, 'Loading/Glow', 57, 456, 184, 5, '#FFFFFF99', 3);
  await centerText(screen, 'Loading/Label', '猫猫正在集合… 70%', 187.5, 498, 16, C.ink, 'SemiBold');
  await centerText(screen, 'Compliance/Age', '适龄提示 8+', 187.5, 617, 12, C.muted, 'Regular');
  await centerText(screen, 'Compliance/Privacy', '进入游戏即表示同意《用户协议》和《隐私政策》', 187.5, 642, 10, C.muted, 'Regular');
  return { screen };
}

async function createHome(sectionId, x, y) {
  const screen = await screenBase(sectionId, 'P01 首页', x, y);
  await currencyPill(screen, 'Currency/Fish', 13, 16, '128', 92, 41);
  const settings = await iconButton(screen, 'IconButton/Settings', 'settings', 319, 15, 43);
  await logoBoard(screen, 77, 61, 221, 148);
  const cats = [
    ['calico', 91, 287, 91], ['black', 207, 278, 93], ['ragdoll', 42, 345, 101],
    ['blue', 234, 337, 103], ['orange', 129, 329, 116],
  ];
  for (const [type, cx, cy, size] of cats) await cat(screen, `Hero/${type}`, type, cx, cy, size);
  const continueHit = await glossyButton(screen, 'Button/Primary/Continue', '继续第1关', 48, 490, 279, 65);
  const map = await navButton(screen, 'Nav/Map', '关卡', 'map', 13, true);
  const collection = await navButton(screen, 'Nav/Collection', '图鉴', 'collection', 135, false);
  const cosmetic = await navButton(screen, 'Nav/Cosmetic', '外观', 'cosmetic', 257, false);
  await centerText(screen, 'SafeArea/Caption', '健康游戏忠告 · 适龄提示 8+', 187.5, 654, 9, '#FFFFFFE0', 'Regular');
  return { screen, continueHit, settings, map, collection, cosmetic };
}

async function createMap(sectionId, x, y) {
  const screen = await screenBase(sectionId, 'P02 24关地图', x, y);
  await softVeil(screen, '#FFF8EAB8');
  const back = await iconButton(screen, 'IconButton/Back', 'back', 15, 17, 43);
  await woodTitle(screen, 'Header', '猫猫小路', 88, 20, 199, 58, 29);
  await currencyPill(screen, 'Currency/Fish', 294, 18, '128', 68, 42);
  const path = await rect(screen, 'Map/PathBase', 47, 110, 281, 470, '#FFF4D8CC', 34);
  await stroke(path, '#DDA34E', 3);
  const xs = [77, 168, 259, 259, 168, 77];
  let currentHit;
  for (let i = 0; i < 24; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const reverse = row % 2 === 1;
    const px = 55 + (reverse ? 3 - col : col) * 70;
    const py = 125 + row * 73;
    const state = i === 0 ? 'Current' : i < 3 ? 'Completed' : 'Locked';
    const fill = state === 'Current' ? C.coral : state === 'Completed' ? C.mint : C.disabled;
    const node = await ellipse(screen, `LevelNode/${String(i + 1).padStart(2, '0')}/${state}`, px, py, 44, 44, fill);
    await stroke(node, C.cream2, state === 'Current' ? 4 : 3);
    await shadow(node, 0.16, 3, 4);
    await centerText(screen, `LevelNode/${i + 1}/Label`, state === 'Locked' ? '锁' : String(i + 1), px + 22, py + 22, 14, C.white, 'ExtraBold');
    if (state === 'Completed') {
      await centerText(screen, `LevelNode/${i + 1}/Star`, '★', px + 34, py + 6, 11, C.gold, 'ExtraBold');
    }
    if (i === 0) currentHit = node;
  }
  const challenge = await glossyButton(screen, 'Button/Primary/Challenge', '挑战第1关', 80, 594, 215, 52);
  return { screen, back, currentHit, challenge };
}

async function boosterTile(parentId, name, type, x, y, selected = false, count = '3') {
  const body = await rect(parentId, `${name}/Shadow`, x, y + 5, 88, 78, selected ? C.purpleDark : C.woodDark, 21);
  const face = await rect(parentId, `${name}/Body`, x, y, 88, 78, selected ? '#EFE1FF' : C.cream, 21);
  await stroke(face, selected ? C.purple : '#D88E40', selected ? 4 : 2);
  await icon(parentId, `${name}/Icon`, type, x + 19, y + 8, 50);
  await ellipse(parentId, `${name}/CountBadge`, x + 60, y + 51, 24, 24, C.cream2);
  await centerText(parentId, `${name}/Count`, count, x + 72, y + 63, 13, C.ink, 'ExtraBold');
  return face;
}

async function createPrepare(sectionId, x, y) {
  const screen = await screenBase(sectionId, 'P03 开局准备', x, y);
  await softVeil(screen, '#FFF8EAAA');
  const back = await iconButton(screen, 'IconButton/Back', 'back', 15, 17, 43);
  await woodTitle(screen, 'Header', '第1关 · 五猫迎宾', 62, 26, 251, 61, 25);
  const panel = await rect(screen, 'Mission/Panel', 35, 112, 305, 188, C.panel, 27);
  await stroke(panel, '#D48B3E', 3);
  await shadow(panel, 0.2, 5, 9);
  for (let i = 0; i < 5; i++) await cat(screen, `Mission/Cat/${CAT_TYPES[i]}`, CAT_TYPES[i], 53 + i * 54, 130 + (i % 2) * 7, 57);
  await centerText(screen, 'Mission/Title', '让全部猫猫回窝', 187.5, 220, 22, C.ink, 'ExtraBold');
  await centerText(screen, 'Mission/Detail', '第一关就有 5 种猫 · 学会插入与三连', 187.5, 257, 13, C.muted, 'Regular');
  await centerText(screen, 'Booster/Heading', '带上道具', 187.5, 338, 17, C.wood, 'SemiBold');
  await boosterTile(screen, 'Booster/Wand', 'wand', 39, 368, true);
  await boosterTile(screen, 'Booster/Catnip', 'catnip', 144, 368, false);
  await boosterTile(screen, 'Booster/Rainbow', 'rainbow', 249, 368, false);
  const start = await glossyButton(screen, 'Button/Primary/Start', '开始送猫猫回窝', 53, 526, 269, 64);
  await centerText(screen, 'Tip', '提示：点按或滑动瞄准，松手发射', 187.5, 623, 12, C.muted, 'Regular');
  return { screen, back, start };
}

async function createGameplay(sectionId, x, y) {
  const screen = await screenBase(sectionId, 'P04 第1关游戏', x, y, 'gameplay');
  const hud = await topHud(screen, 1);
  const chain = [
    ['orange', 42, 151, 44], ['ragdoll', 80, 147, 44], ['blue', 118, 148, 43], ['calico', 155, 152, 43],
    ['black', 193, 152, 43], ['orange', 230, 151, 43], ['ragdoll', 267, 159, 42],
    ['black', 69, 207, 42], ['calico', 103, 216, 43], ['blue', 139, 224, 43], ['ragdoll', 176, 235, 43], ['orange', 213, 247, 43],
    ['orange', 72, 310, 43], ['blue', 109, 313, 43], ['black', 147, 316, 43], ['ragdoll', 185, 321, 43], ['calico', 222, 329, 43],
    ['ragdoll', 49, 392, 43], ['calico', 84, 400, 43], ['orange', 121, 405, 43], ['blue', 158, 407, 43], ['black', 195, 409, 43],
  ];
  for (let i = 0; i < chain.length; i++) {
    const [type, cx, cy, size] = chain[i];
    await cat(screen, `Chain/PathAligned/${String(i + 1).padStart(2, '0')}/${type}`, type, cx, cy, size);
  }
  await centerText(screen, 'Tutorial/Hint', '沿奶油轨道送猫猫回窝', 187.5, 457, 11, C.wood, 'SemiBold');
  await centerText(screen, 'Launcher/Aim', '↑', 187.5, 485, 40, C.white, 'ExtraBold');
  await cat(screen, 'Launcher/Current/orange', 'orange', 153, 478, 70);
  await ellipse(screen, 'Launcher/NextBubble', 276, 502, 49, 49, '#FFFFFFCC');
  await cat(screen, 'Launcher/Next/blue', 'blue', 282, 508, 37);
  await centerText(screen, 'Launcher/NextLabel', '下一只', 300.5, 491, 10, C.muted, 'Regular');
  const boosterWand = await boosterTile(screen, 'Booster/Wand', 'wand', 18, 574, false);
  const boosterCatnip = await boosterTile(screen, 'Booster/Catnip', 'catnip', 143, 574, false);
  const boosterRainbow = await boosterTile(screen, 'Booster/Rainbow', 'rainbow', 268, 574, false);
  return { screen, pause: hud.pause, boosterWand, boosterCatnip, boosterRainbow };
}

async function createPause(sectionId, x, y) {
  const screen = await screenBase(sectionId, 'P05 暂停弹窗', x, y, 'gameplay');
  await rect(screen, 'Overlay/Dim', 0, 0, 375, 667, '#2B20308C', 0);
  const panel = await rect(screen, 'Dialog/Shadow', 42, 137, 291, 410, C.woodDark, 30);
  const face = await rect(screen, 'Dialog/Panel', 42, 128, 291, 410, C.panel, 30);
  await stroke(face, '#D98B3D', 4);
  await cat(screen, 'Dialog/Cat', 'ragdoll', 143, 77, 89);
  await woodTitle(screen, 'Dialog/Header', '猫猫歇一会', 78, 173, 219, 62, 27);
  const resume = await glossyButton(screen, 'Button/Primary/Resume', '继续游戏', 78, 274, 219, 58);
  const restart = await glossyButton(screen, 'Button/Secondary/Restart', '重新开始', 95, 350, 185, 49, C.mint, C.mintDark);
  const map = await glossyButton(screen, 'Button/Tertiary/Map', '返回地图', 95, 415, 185, 49, C.cream, '#C49865');
  await centerText(screen, 'Pause/Hint', '当前进度将自动保存', 187.5, 498, 12, C.muted, 'Regular');
  return { screen, resume, restart, map };
}

async function resultPanel(screen, victory) {
  await rect(screen, 'Overlay/Dim', 0, 0, 375, 667, victory ? '#20482E55' : '#1F183F88', 0);
  const panelShadow = await rect(screen, 'Dialog/Shadow', 25, 132, 325, 461, C.woodDark, 30);
  const panel = await rect(screen, 'Dialog/Panel', 25, 123, 325, 461, C.panel, 30);
  await stroke(panel, '#D98B3D', 4);
  const cats = victory ? CAT_TYPES : ['orange', 'ragdoll', 'blue', 'calico', 'black'];
  for (let i = 0; i < cats.length; i++) await cat(screen, `Dialog/Cats/${cats[i]}`, cats[i], 57 + i * 53, 79 + (i % 2) * 4, 58);
  await woodTitle(screen, 'Dialog/Header', victory ? '全员回窝！' : '罐头仓库挤满啦', victory ? 71 : 47, 166, victory ? 233 : 281, 62, victory ? 31 : 24);
  if (victory) {
    for (let i = 0; i < 3; i++) {
      const star = await ellipse(screen, `Result/Stars/${i + 1}`, 78 + i * 75, 253, 61, 61, C.gold);
      await stroke(star, '#F0A22B', 3);
      await centerText(screen, `Result/Stars/${i + 1}/Glyph`, '★', 108.5 + i * 75, 283.5, 34, C.white, 'ExtraBold');
    }
    const scorePanel = await rect(screen, 'Result/ScorePanel', 73, 334, 229, 78, C.cream, 18);
    await stroke(scorePanel, '#E1A252', 2);
    await icon(screen, 'Result/Fish', 'fish', 95, 349, 44);
    await centerText(screen, 'Result/Score', '12,680', 207, 367, 28, C.ink, 'ExtraBold');
    await centerText(screen, 'Result/Stats', '奖励 +52  ·  最大连击 ×9', 187.5, 430, 12, C.muted, 'Regular');
    const primary = await glossyButton(screen, 'Button/Primary/Next', '下一关', 72, 467, 231, 57);
    const secondary = await glossyButton(screen, 'Button/Secondary/Replay', '再玩一次', 104, 537, 167, 43, C.mint, C.mintDark);
    return { primary, secondary };
  }
  await centerText(screen, 'Result/Remaining', '还差 7 只猫猫', 187.5, 282, 26, C.ink, 'ExtraBold');
  await centerText(screen, 'Result/Hint', '免费看一次，猫猫队伍后退 6 格', 187.5, 329, 13, C.muted, 'Regular');
  const primary = await glossyButton(screen, 'Button/Rewarded/Revive', '免费帮一次', 72, 383, 231, 58, C.purple, C.purpleDark);
  const secondary = await glossyButton(screen, 'Button/Secondary/Retry', '重新开始', 104, 456, 167, 45, C.mint, C.mintDark);
  const map = await glossyButton(screen, 'Button/Tertiary/Map', '返回地图', 104, 518, 167, 42, C.cream, '#C49865');
  return { primary, secondary, map };
}

async function createResult(sectionId, x, y, victory) {
  const screen = await screenBase(sectionId, victory ? 'P06 胜利结算' : 'P07 失败复活', x, y);
  const actions = await resultPanel(screen, victory);
  return { screen, ...actions };
}

async function createCollection(sectionId, x, y) {
  const screen = await screenBase(sectionId, 'P08 猫咪图鉴', x, y);
  await softVeil(screen);
  const back = await iconButton(screen, 'IconButton/Back', 'back', 15, 17, 43);
  await woodTitle(screen, 'Header', '猫猫图鉴', 88, 20, 199, 58, 29);
  await centerText(screen, 'Progress', '已发现 5 / 12', 187.5, 104, 13, C.muted, 'Regular');
  const types = [...CAT_TYPES, 'unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown'];
  for (let i = 0; i < 12; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const px = 23 + col * 116;
    const py = 129 + row * 115;
    const unlocked = i < 5;
    const body = await rect(screen, `CollectionCard/${i + 1}/${unlocked ? 'Unlocked' : 'Locked'}`, px, py, 98, 99, unlocked ? C.cream2 : '#A9A19C', 18);
    await stroke(body, unlocked ? '#E2A458' : '#D1CBC5', 2);
    await shadow(body, 0.13, 4, 5);
    if (unlocked) await cat(screen, `CollectionCard/${i + 1}/Cat`, types[i], px + 16, py + 7, 66);
    else {
      await ellipse(screen, `CollectionCard/${i + 1}/Unknown`, px + 26, py + 12, 48, 48, '#726B67');
      await centerText(screen, `CollectionCard/${i + 1}/Question`, '?', px + 50, py + 36, 24, C.white, 'ExtraBold');
    }
    await centerText(screen, `CollectionCard/${i + 1}/Label`, unlocked ? CAT_LABELS[types[i]] : `${18 + (i - 5) * 3}星解锁`, px + 49, py + 82, unlocked ? 12 : 10, unlocked ? C.ink : C.white, 'SemiBold');
    if (i === 4) {
      await ellipse(screen, 'CollectionCard/NewBadge', px + 75, py - 7, 27, 27, C.coral);
      await centerText(screen, 'CollectionCard/NewLabel', '新', px + 88.5, py + 6.5, 11, C.white, 'ExtraBold');
    }
  }
  return { screen, back };
}

async function createCosmetics(sectionId, x, y) {
  const screen = await screenBase(sectionId, 'P09 外观选择', x, y);
  await softVeil(screen);
  const back = await iconButton(screen, 'IconButton/Back', 'back', 15, 17, 43);
  await woodTitle(screen, 'Header', '猫窝外观', 88, 20, 199, 58, 29);
  await currencyPill(screen, 'Currency/Fish', 291, 19, '128', 71, 42);
  const preview = await rect(screen, 'Preview/Panel', 39, 111, 297, 174, '#FFF2D8DD', 25);
  await stroke(preview, '#D99A50', 2);
  await cat(screen, 'Preview/Cat', 'orange', 137, 125, 101);
  await centerText(screen, 'Preview/Name', '阳光藤编窝', 187.5, 251, 15, C.ink, 'SemiBold');
  await rect(screen, 'Tabs/Track', 75, 303, 225, 41, C.cream, 21);
  await rect(screen, 'Tabs/Selected', 78, 306, 108, 35, C.coral, 18);
  await centerText(screen, 'Tabs/Home', '猫窝', 132, 323.5, 14, C.white, 'SemiBold');
  await centerText(screen, 'Tabs/Trail', '拖尾', 243, 323.5, 14, C.ink, 'SemiBold');
  const states = ['Equipped', 'Owned', 'Buyable', 'Locked', 'Buyable', 'Locked'];
  const labels = ['藤编窝', '云朵窝', '星月窝', '樱花窝', '海盐窝', '夜灯窝'];
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const px = 24 + col * 116;
    const py = 370 + row * 127;
    const state = states[i];
    const body = await rect(screen, `CosmeticCard/${i + 1}/${state}`, px, py, 98, 111, state === 'Equipped' ? '#FFE299' : C.cream2, 18);
    await stroke(body, state === 'Equipped' ? C.coral : '#D9A05C', state === 'Equipped' ? 3 : 2);
    await icon(screen, `CosmeticCard/${i + 1}/Art`, 'cosmetic', px + 26, py + 8, 46);
    await centerText(screen, `CosmeticCard/${i + 1}/Name`, labels[i], px + 49, py + 67, 11, C.ink, 'SemiBold');
    await centerText(screen, `CosmeticCard/${i + 1}/State`, state === 'Equipped' ? '使用中' : state === 'Owned' ? '已拥有' : state === 'Locked' ? '第12关' : `${180 + i * 40}鱼`, px + 49, py + 92, 10, state === 'Equipped' ? C.coralDark : C.muted, 'Regular');
  }
  return { screen, back };
}

async function createSettings(sectionId, x, y) {
  const screen = await screenBase(sectionId, 'P10 设置', x, y);
  await softVeil(screen);
  const back = await iconButton(screen, 'IconButton/Back', 'back', 15, 17, 43);
  await woodTitle(screen, 'Header', '设置', 118, 30, 139, 61, 30);
  const rows = [['音乐', true], ['音效', true], ['震动', false]];
  for (let i = 0; i < rows.length; i++) {
    const py = 146 + i * 91;
    const card = await rect(screen, `Setting/${rows[i][0]}/Row`, 39, py, 297, 65, C.cream2, 22);
    await stroke(card, '#DCA15C', 2);
    await centerText(screen, `Setting/${rows[i][0]}/Label`, rows[i][0], 87, py + 32.5, 18, C.ink, 'SemiBold');
    const toggle = await rect(screen, `Setting/${rows[i][0]}/Toggle/${rows[i][1] ? 'On' : 'Off'}`, 251, py + 16, 61, 34, rows[i][1] ? C.mint : C.disabled, 17);
    await ellipse(screen, `Setting/${rows[i][0]}/Knob`, rows[i][1] ? 280 : 255, py + 19, 28, 28, C.white);
  }
  const privacy = await rect(screen, 'Compliance/Panel', 39, 437, 297, 91, '#FFF9ECDD', 20);
  await centerText(screen, 'Compliance/Age', '适龄提示：8岁以上', 187.5, 461, 14, C.ink, 'SemiBold');
  await centerText(screen, 'Compliance/Links', '隐私政策  ·  用户协议  ·  家长监护', 187.5, 495, 12, C.muted, 'Regular');
  const save = await glossyButton(screen, 'Button/Primary/Save', '保存并返回', 89, 559, 197, 54);
  return { screen, back, save };
}

async function createCommonStates(sectionId, x, y) {
  const screen = await screenBase(sectionId, 'P11 通用状态', x, y);
  await softVeil(screen);
  await woodTitle(screen, 'Header', '通用反馈', 88, 24, 199, 58, 28);
  const items = [
    ['Info', C.blue, '正在连接猫窝…'], ['Success', C.mint, '保存成功'], ['Error', C.coral, '网络开小差啦'], ['Offline', C.purple, '离线也能继续第1关'],
  ];
  for (let i = 0; i < items.length; i++) {
    const [state, color, label] = items[i];
    const py = 126 + i * 73;
    const toast = await rect(screen, `Toast/${state}`, 44, py, 287, 53, '#FFF9ECF2', 20);
    await stroke(toast, color, 3);
    await ellipse(screen, `Toast/${state}/Dot`, 61, py + 17, 19, 19, color);
    await centerText(screen, `Toast/${state}/Text`, label, 197, py + 26.5, 14, C.ink, 'SemiBold');
  }
  const adPanel = await rect(screen, 'Dialog/AdUnavailable', 50, 438, 275, 146, C.panel, 24);
  await stroke(adPanel, '#D89A52', 3);
  await centerText(screen, 'Dialog/AdUnavailable/Title', '暂时没有视频', 187.5, 475, 20, C.ink, 'ExtraBold');
  await centerText(screen, 'Dialog/AdUnavailable/Body', '稍后再试，或直接重新开始', 187.5, 513, 13, C.muted, 'Regular');
  await glossyButton(screen, 'Dialog/AdUnavailable/Retry', '知道了', 111, 539, 153, 40, C.mint, C.mintDark);
  return { screen };
}

async function createShare(sectionId, x, y) {
  const screen = await screenBase(sectionId, 'P12 录屏分享高光', x, y);
  await rect(screen, 'Overlay/Dim', 0, 0, 375, 667, '#30203C66', 0);
  const panel = await rect(screen, 'Share/CardShadow', 34, 91, 307, 483, C.woodDark, 28);
  const face = await rect(screen, 'Share/Card', 34, 82, 307, 483, C.panel, 28);
  await stroke(face, '#D99142', 4);
  await cat(screen, 'Share/Hero', 'calico', 123, 109, 129);
  await woodTitle(screen, 'Share/Header', '神仙三连！', 71, 245, 233, 62, 29);
  await centerText(screen, 'Share/Score', '12,680', 187.5, 341, 33, C.ink, 'ExtraBold');
  await centerText(screen, 'Share/Caption', '连续 9 次贴贴 · 一口气送回 18 只', 187.5, 382, 13, C.muted, 'Regular');
  const share = await glossyButton(screen, 'Button/Primary/Share', '分享高光', 72, 433, 231, 58);
  const close = await glossyButton(screen, 'Button/Secondary/Close', '继续游戏', 104, 511, 167, 43, C.mint, C.mintDark);
  return { screen, share, close };
}

async function buildReference(sectionId) {
  const board = await frame(sectionId, 'MMHW/V2/00_ImageGen_Final_Masters', 80, 170, 4300, 1020, '#F5EADB');
  await text(board, 'Heading', '00 · ImageGen 最终视觉母版', 34, 27, 29, C.ink, 'ExtraBold');
  await text(board, 'Caption', '所有 Figma 页面必须继承母版的软糖猫、奶油木作、晴日庭院、粗圆字体与高光阴影。', 34, 69, 15, C.muted, 'Regular');
  await image(board, 'Master/Home', 'art/final/home_master.png', 34, 112, 355, 631, 'FIT');
  await image(board, 'Master/Gameplay', 'art/final/gameplay_master.png', 421, 112, 355, 631, 'FIT');
  await image(board, 'Master/Results', 'art/final/result_master.png', 812, 112, 1060, 596, 'FIT');
  await image(board, 'Master/Cats', 'assets/game/art/cats/cat_atlas.png', 1908, 128, 1110, 222, 'FIT');
  await image(board, 'Master/Icons', 'art/final/icons/icon_atlas.png', 1908, 392, 1110, 277, 'FIT');
  await image(board, 'Plate/Home', 'art/final/home_background.png', 3054, 111, 330, 587, 'FIT');
  await image(board, 'Plate/Gameplay', 'art/final/gameplay_background.png', 3418, 111, 330, 587, 'FIT');
  const gate = await rect(board, 'VisualGate/Panel', 3784, 111, 476, 587, C.cream2, 24);
  await stroke(gate, '#D49A55', 2);
  await text(board, 'VisualGate/Title', '视觉硬门槛', 3814, 142, 22, C.coralDark, 'ExtraBold');
  await text(board, 'VisualGate/Body', '✓ 猫咪必须落在轨道中心线\n✓ 第一关同时出现 5 种猫\n✓ 所有文字用文渊圆体\n✓ 标题、按钮按真实边界居中\n✓ 图标全部使用正式图片\n✓ 不使用 Emoji 占位图标\n✓ UI 与猫咪保持可编辑层\n✓ 375×667 安全区无越界\n\nCocos 状态：暂停\n只有产品负责人验收通过后继续', 3814, 194, 16, C.ink, 'SemiBold');
  await text(board, 'Footer', '母版、透明猫咪、正式图标与无 UI 场景底图均已进入 Git；本板只作唯一视觉基准。', 1908, 720, 14, C.muted, 'Regular');
  return board;
}

async function buildFoundations(sectionId) {
  const board = await frame(sectionId, 'MMHW/V2/01_Foundations', 4420, 170, 1230, 1020, '#FFF9EC');
  await text(board, 'Heading', '01 · 视觉基础与字体', 34, 27, 29, C.ink, 'ExtraBold');
  await text(board, 'Direction', '软糖猫咪 × 奶油木作 × 晴日庭院', 34, 72, 17, C.wood, 'SemiBold');
  const swatches = Object.entries({ Sky: C.sky, Cream: C.cream, Ink: C.ink, Wood: C.wood, Orange: C.orange, Coral: C.coral, Mint: C.mint, Blue: C.blue, Purple: C.purple, Gold: C.gold });
  for (let i = 0; i < swatches.length; i++) {
    const [name, color] = swatches[i];
    const col = i % 5;
    const row = Math.floor(i / 5);
    const px = 34 + col * 231;
    const py = 128 + row * 113;
    const swatch = await rect(board, `Token/${name}`, px, py, 202, 66, color, 16);
    await stroke(swatch, C.white, 3);
    await text(board, `Token/${name}/Name`, `${name}  ${color}`, px, py + 76, 12, C.ink, 'Regular');
  }
  await text(board, 'Type/Title', '唯一发布字体：文渊圆体 VF', 34, 378, 19, C.ink, 'ExtraBold');
  await text(board, 'Type/H1', '喵喵回窝', 34, 420, 43, C.ink, 'ExtraBold');
  await text(board, 'Type/H2', '全员回窝！', 35, 492, 30, C.wood, 'ExtraBold');
  await text(board, 'Type/Button', '开始送猫猫回窝', 35, 548, 21, C.coralDark, 'SemiBold');
  await text(board, 'Type/Body', '让相同猫猫连成三只，开心贴贴回窝。', 35, 593, 16, C.muted, 'Regular');
  const sample = await glossyButton(board, 'Centering/Sample', '文本真实居中', 34, 668, 305, 62);
  await text(board, 'Centering/Rule', '居中规则：创建文字 → 读取真实宽高 → 用中心点回算坐标；禁止用字符数量估算。', 377, 679, 15, C.ink, 'SemiBold');
  await text(board, 'Grid', '间距：8 / 12 / 16 / 24 / 32 / 48   ·   圆角：16 / 20 / 24 / 30 / 全圆\n触控热区：最小 44pt   ·   标题安全区：顶部 44pt   ·   底部安全区：34pt', 34, 790, 15, C.muted, 'Regular');
  await text(board, 'DoDont', 'DO：猫、轨道、回窝目标同屏可见。   DON’T：默认控件、系统 Emoji、细黑体、漂移文字。', 34, 910, 15, C.coralDark, 'SemiBold');
  return { board, sample };
}

async function componentize(nodeId, name) {
  return call('create_component', { nodeId, name });
}

async function smallButtonComponent(board, x, y, variant, label, color, dark, disabled = false) {
  const f = await frame(board, `Button/Primary/${variant}`, x, y, 230, 68, '#00000000');
  await glossyButton(f, 'Layers', label, 0, variant === 'Pressed' ? 4 : 0, 230, variant === 'Pressed' ? 54 : 58, color, dark, disabled);
  await componentize(f, `MMHW/Button/Primary/${variant}`);
}

async function stateCard(board, name, x, y, width, height, fill = C.cream2) {
  const f = await roundedFrame(board, name, x, y, width, height, fill, 20);
  await stroke(f, '#E0A459', 2);
  return f;
}

async function buildComponents(sectionId) {
  const board = await frame(sectionId, 'MMHW/V2/02_Components_All_States', 80, 1240, 8960, 1390, '#F4E7D6');
  await text(board, 'Heading', '02 · 全量组件与状态（发布级可编辑组件）', 34, 27, 29, C.ink, 'ExtraBold');
  await text(board, 'Caption', '按钮、HUD、猫咪、关卡、道具、弹窗、Toast、开关、图鉴、外观均覆盖上线需要的状态；不使用系统 Emoji。', 34, 70, 15, C.muted, 'Regular');
  await text(board, 'Group/ButtonPrimary', '主按钮', 34, 114, 18, C.wood, 'ExtraBold');
  await smallButtonComponent(board, 34, 150, 'Normal', '继续第1关', C.coral, C.coralDark);
  await smallButtonComponent(board, 284, 150, 'Pressed', '继续第1关', '#F05C4A', '#C63E32');
  await smallButtonComponent(board, 534, 150, 'Disabled', '暂不可用', C.disabled, '#968D86', true);
  await smallButtonComponent(board, 784, 150, 'Loading', '猫猫集合中', C.coral, C.coralDark);

  await text(board, 'Group/OtherButtons', '次按钮 / 激励视频', 34, 251, 18, C.wood, 'ExtraBold');
  const buttonStates = [
    ['Secondary/Normal', '再玩一次', C.mint, C.mintDark], ['Secondary/Pressed', '再玩一次', '#58C49F', '#2F896D'],
    ['Secondary/Disabled', '不可用', C.disabled, '#978E86'], ['Rewarded/Ready', '免费帮一次', C.purple, C.purpleDark],
    ['Rewarded/Loading', '视频加载中', '#987EC4', C.purpleDark], ['Rewarded/Unavailable', '暂无视频', C.disabled, '#978E86'],
    ['Rewarded/Completed', '已复活', C.mint, C.mintDark],
  ];
  for (let i = 0; i < buttonStates.length; i++) {
    const [name, label, color, dark] = buttonStates[i];
    const f = await frame(board, `Button/${name}`, 34 + i * 250, 288, 230, 66, '#00000000');
    await glossyButton(f, 'Layers', label, 0, 0, 230, 56, color, dark, name.includes('Disabled') || name.includes('Unavailable'));
    await componentize(f, `MMHW/Button/${name}`);
  }

  await text(board, 'Group/HUD', 'HUD / 进度 / 图标按钮', 34, 392, 18, C.wood, 'ExtraBold');
  const currency = await frame(board, 'CurrencyPill/Fish', 34, 430, 128, 58, '#00000000');
  await currencyPill(currency, 'Layers', 0, 0, '1,280', 128, 50);
  await componentize(currency, 'MMHW/CurrencyPill/Fish');
  const purrStates = [['Normal', 0.55, C.purple], ['Ready', 1, C.gold], ['Frenzy', 1, C.coral]];
  for (let i = 0; i < purrStates.length; i++) {
    const [state, ratio, color] = purrStates[i];
    const f = await frame(board, `Progress/Purr/${state}`, 194 + i * 342, 430, 318, 58, '#00000000');
    await rect(f, 'Track', 10, 15, 296, 26, C.cream2, 13);
    await rect(f, 'Fill', 14, 19, 288 * ratio, 18, color, 9);
    await componentize(f, `MMHW/Progress/Purr/${state}`);
  }
  const iconDefs = [['Pause', 'pause'], ['Settings', 'settings'], ['Close', 'close'], ['Back', 'back']];
  for (let i = 0; i < iconDefs.length; i++) {
    const f = await frame(board, `IconButton/${iconDefs[i][0]}`, 1260 + i * 76, 423, 62, 62, '#00000000');
    await iconButton(f, 'Layers', iconDefs[i][1], 6, 4, 50);
    await componentize(f, `MMHW/IconButton/${iconDefs[i][0]}`);
  }

  await text(board, 'Group/Level', '关卡节点 / 开关 / Toast', 34, 536, 18, C.wood, 'ExtraBold');
  const levelStates = [['Locked', C.disabled, '锁'], ['Current', C.coral, '4'], ['Completed', C.mint, '3'], ['Perfect', C.gold, '★']];
  for (let i = 0; i < levelStates.length; i++) {
    const f = await frame(board, `LevelNode/${levelStates[i][0]}`, 34 + i * 92, 574, 72, 72, '#00000000');
    const node = await ellipse(f, 'Body', 8, 8, 56, 56, levelStates[i][1]);
    await stroke(node, C.cream2, 4);
    await centerText(f, 'Label', levelStates[i][2], 36, 36, 16, C.white, 'ExtraBold');
    await componentize(f, `MMHW/LevelNode/${levelStates[i][0]}`);
  }
  for (let i = 0; i < 2; i++) {
    const state = i === 0 ? 'On' : 'Off';
    const f = await frame(board, `Toggle/${state}`, 430 + i * 100, 584, 80, 52, '#00000000');
    await rect(f, 'Track', 8, 9, 64, 34, i === 0 ? C.mint : C.disabled, 17);
    await ellipse(f, 'Knob', i === 0 ? 39 : 11, 12, 28, 28, C.white);
    await componentize(f, `MMHW/Toggle/${state}`);
  }
  const toastDefs = [['Info', C.blue], ['Success', C.mint], ['Error', C.coral], ['Offline', C.purple]];
  for (let i = 0; i < toastDefs.length; i++) {
    const f = await frame(board, `Toast/${toastDefs[i][0]}`, 650 + i * 322, 574, 298, 64, '#00000000');
    const toast = await rect(f, 'Body', 4, 4, 290, 54, C.cream2, 20);
    await stroke(toast, toastDefs[i][1], 3);
    await ellipse(f, 'Dot', 20, 21, 19, 19, toastDefs[i][1]);
    await centerText(f, 'Label', ['正在连接…', '保存成功', '网络开小差', '离线可继续'][i], 169, 31, 14, C.ink, 'SemiBold');
    await componentize(f, `MMHW/Toast/${toastDefs[i][0]}`);
  }

  await text(board, 'Group/Cats', '猫咪徽章（第一关 5 种同时登场）', 34, 688, 18, C.wood, 'ExtraBold');
  const catDefs = [...CAT_TYPES, 'unknown'];
  for (let i = 0; i < catDefs.length; i++) {
    const type = catDefs[i];
    const f = await stateCard(board, `CatBadge/${type}`, 34 + i * 145, 726, 125, 143, type === 'unknown' ? '#ABA39D' : C.cream2);
    if (type === 'unknown') {
      await ellipse(f, 'Silhouette', 30, 18, 65, 65, '#706864');
      await centerText(f, 'Question', '?', 62.5, 50.5, 27, C.white, 'ExtraBold');
    } else await cat(f, 'Sprite', type, 16, 8, 93);
    await centerText(f, 'Label', CAT_LABELS[type], 62.5, 116, 14, type === 'unknown' ? C.white : C.ink, 'SemiBold');
    await componentize(f, `MMHW/CatBadge/${type}`);
  }

  await text(board, 'Group/Boosters', '道具：可用 / 空 / 选中', 974, 688, 18, C.wood, 'ExtraBold');
  const boosters = [['Wand', 'wand'], ['Catnip', 'catnip'], ['Rainbow', 'rainbow']];
  const boosterStates = ['Available', 'Empty', 'Selected'];
  for (let b = 0; b < boosters.length; b++) {
    for (let s = 0; s < boosterStates.length; s++) {
      const state = boosterStates[s];
      const f = await frame(board, `BoosterChip/${boosters[b][0]}/${state}`, 974 + (b * 3 + s) * 107, 726, 96, 100, '#00000000');
      const face = await rect(f, 'Body', 5, 4, 86, 82, state === 'Selected' ? '#EEDFFF' : state === 'Empty' ? '#D8D1CB' : C.cream, 21);
      await stroke(face, state === 'Selected' ? C.purple : '#D88E40', state === 'Selected' ? 4 : 2);
      await icon(f, 'Icon', boosters[b][1], 23, 13, 50);
      if (state === 'Empty') await call('set_opacity', { nodeIds: [face], opacity: 0.65 });
      await centerText(f, 'Count', state === 'Empty' ? '0' : '3', 78, 77, 12, C.ink, 'ExtraBold');
      await componentize(f, `MMHW/BoosterChip/${boosters[b][0]}/${state}`);
    }
  }

  await text(board, 'Group/Cards', '图鉴卡 / 外观卡 / 基础弹窗', 34, 923, 18, C.wood, 'ExtraBold');
  const collectionStates = ['Locked', 'Unlocked', 'New'];
  for (let i = 0; i < collectionStates.length; i++) {
    const state = collectionStates[i];
    const f = await stateCard(board, `CollectionCard/${state}`, 34 + i * 154, 963, 134, 154, state === 'Locked' ? '#A9A19C' : C.cream2);
    if (state === 'Locked') {
      await ellipse(f, 'Unknown', 35, 22, 64, 64, '#706864');
      await centerText(f, 'Question', '?', 67, 54, 27, C.white, 'ExtraBold');
    } else await cat(f, 'Cat', state === 'New' ? 'black' : 'orange', 20, 10, 94);
    await centerText(f, 'Label', state === 'Locked' ? '18星解锁' : state === 'New' ? '煤球 · 新' : '橘团', 67, 126, 13, state === 'Locked' ? C.white : C.ink, 'SemiBold');
    await componentize(f, `MMHW/CollectionCard/${state}`);
  }
  const cosmeticStates = ['Locked', 'Buyable', 'Owned', 'Equipped'];
  for (let i = 0; i < cosmeticStates.length; i++) {
    const state = cosmeticStates[i];
    const f = await stateCard(board, `CosmeticCard/${state}`, 535 + i * 154, 963, 134, 154, state === 'Equipped' ? '#FFE29A' : C.cream2);
    await icon(f, 'Art', 'cosmetic', 36, 15, 63);
    await centerText(f, 'Name', '藤编窝', 67, 96, 13, C.ink, 'SemiBold');
    await centerText(f, 'State', state === 'Locked' ? '第12关' : state === 'Buyable' ? '260鱼' : state === 'Owned' ? '已拥有' : '使用中', 67, 128, 12, state === 'Equipped' ? C.coralDark : C.muted, 'Regular');
    await componentize(f, `MMHW/CosmeticCard/${state}`);
  }
  const dialog = await frame(board, 'Dialog/Base', 1210, 943, 360, 264, '#00000000');
  const dialogFace = await rect(dialog, 'Panel', 10, 10, 340, 238, C.panel, 28);
  await stroke(dialogFace, '#D98B3D', 4);
  await woodTitle(dialog, 'Header', '弹窗标题', 67, 35, 226, 58, 27);
  await centerText(dialog, 'Body', '说明文字最多两行，主操作始终居中。', 180, 133, 14, C.muted, 'Regular');
  await glossyButton(dialog, 'Primary', '确认', 92, 171, 176, 49);
  await componentize(dialog, 'MMHW/Dialog/Base');
  await text(board, 'Motion', '动效：按钮 80ms 压下 / 140ms 回弹；贴贴 120ms 蓄力 / 420ms 回窝；呼噜暴走 300ms 蓄势 / 650ms 批量飞行。', 34, 1287, 15, C.muted, 'Regular');
  return board;
}

async function buildUserFlow(sectionId, screens) {
  const board = await frame(sectionId, 'MMHW/V2/03_User_Flow', 80, 3520, 1410, 1020, '#FFF9EC');
  await text(board, 'Heading', '03 · 完整用户流程', 34, 27, 28, C.ink, 'ExtraBold');
  const flow = [
    ['P00', '加载合规'], ['P01', '首页'], ['P03', '开局准备'], ['P04', '核心游戏'], ['P06', '胜利'], ['P02', '24关地图'],
    ['P05', '暂停'], ['P07', '失败复活'], ['P08', '图鉴'], ['P09', '外观'], ['P10', '设置'], ['P12', '高光分享'],
  ];
  for (let i = 0; i < flow.length; i++) {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const px = 34 + col * 225;
    const py = 120 + row * 230;
    const card = await rect(board, `Flow/${flow[i][0]}`, px, py, 174, 116, i <= 5 ? '#FFE8BC' : '#E5F4EC', 20);
    await stroke(card, i <= 5 ? '#E69B43' : '#69B693', 2);
    await centerText(board, `Flow/${flow[i][0]}/Code`, flow[i][0], px + 87, py + 33, 18, C.coralDark, 'ExtraBold');
    await centerText(board, `Flow/${flow[i][0]}/Name`, flow[i][1], px + 87, py + 77, 15, C.ink, 'SemiBold');
    if (col < 5) await centerText(board, `Flow/Arrow/${i}`, '→', px + 199, py + 58, 25, C.wood, 'ExtraBold');
  }
  await text(board, 'Flow/Main', '主循环：加载 → 首页 → 准备 → 游戏 → 胜利 → 地图 → 下一关', 34, 622, 17, C.ink, 'ExtraBold');
  await text(board, 'Flow/Branches', '失败分支：游戏 → 复活视频 → 原地继续；无视频 → 重开 / 地图\n长期分支：首页 → 图鉴 / 外观 / 设置；高光分支：胜利或呼噜暴走 → 录屏分享 → 返回游戏', 34, 668, 15, C.muted, 'Regular');
  await text(board, 'Flow/Guard', '所有高频出口都有返回路径；所有外部失败都有降级状态；广告未就绪绝不阻断继续游戏。', 34, 792, 15, C.coralDark, 'SemiBold');
  return board;
}

const LEVELS = [
  ['1', '五猫迎宾', '5猫', '慢', '无', '3,500 / 6,500 / 9,000'], ['2', '弯弯小径', '5猫', '慢', '单弯', '4,000 / 7,200 / 10,000'],
  ['3', '第一次贴贴', '5猫', '慢', '教学连锁', '4,500 / 8,000 / 11,500'], ['4', '花田回旋', '5猫', '中', '双弯', '5,000 / 9,000 / 13,000'],
  ['5', '呼噜热身', '5猫', '中', '呼噜槽', '5,500 / 10,000 / 14,000'], ['6', '小桥排队', '5猫', '中', '窄桥', '6,000 / 11,000 / 15,000'],
  ['7', '三色假象', '5猫', '中', '同色隔断', '6,500 / 12,000 / 16,500'], ['8', '黄昏归队', '5猫', '中', '暮色', '7,000 / 13,000 / 18,000'],
  ['9', '叶片转角', '5猫', '中', '急弯', '7,500 / 14,000 / 19,000'], ['10', '第一场暴走', '5猫', '中+', '暴走必出', '8,000 / 15,000 / 20,500'],
  ['11', '花卷抢位', '5猫', '中+', '插队猫', '8,500 / 16,000 / 22,000'], ['12', '猫薄荷日', '5猫', '中+', '道具教学', '9,000 / 17,000 / 23,000'],
  ['13', '仓库预警', '5猫', '快', '容量-2', '10,000 / 18,000 / 25,000'], ['14', '双桥交会', '5猫', '快', '双入口', '10,500 / 19,000 / 26,000'],
  ['15', '煤球夜巡', '5猫', '快', '夜色', '11,000 / 20,000 / 28,000'], ['16', '彩虹救场', '5猫', '快', '彩虹教学', '11,500 / 21,000 / 29,500'],
  ['17', '蓝莓迷阵', '5猫', '快', '伪分叉', '12,000 / 22,000 / 31,000'], ['18', '雪团连环', '5猫', '快', '连续弯', '12,500 / 23,000 / 32,500'],
  ['19', '回窝倒计时', '5猫', '快+', '节奏波', '13,000 / 24,000 / 34,000'], ['20', '大呼噜祭', '5猫', '快+', '双暴走', '14,000 / 26,000 / 36,000'],
  ['21', '五猫大巡游', '5猫', '快+', '长链', '15,000 / 28,000 / 38,000'], ['22', '罐头保卫战', '5猫', '快+', '容量-4', '16,000 / 30,000 / 41,000'],
  ['23', '最后的花径', '5猫', '快+', '全机制', '17,000 / 32,000 / 44,000'], ['24', '全员回窝', '5猫', '终局', '首章Boss', '20,000 / 36,000 / 50,000'],
];

async function buildLevelContent(sectionId) {
  const board = await frame(sectionId, 'MMHW/V2/06_Level_Content_24', 1530, 3520, 2670, 2050, '#F5EADB');
  await text(board, 'Heading', '06 · 首发 24 关完整内容', 34, 27, 28, C.ink, 'ExtraBold');
  await text(board, 'Caption', '第一关即展示 5 种猫；前 3 关在 60 秒内教会瞄准、插入、三连、连锁。', 34, 70, 15, C.coralDark, 'SemiBold');
  const chapterNames = ['第1章 · 晴日庭院', '第2章 · 花田回旋', '第3章 · 黄昏仓库', '第4章 · 全员回窝'];
  for (let c = 0; c < 4; c++) {
    const px = 34 + c * 646;
    const header = await rect(board, `Chapter/${c + 1}`, px, 112, 612, 70, [C.orange, C.mint, C.purple, C.coral][c], 20);
    await centerText(board, `Chapter/${c + 1}/Title`, chapterNames[c], px + 306, 147, 20, C.white, 'ExtraBold');
  }
  for (let i = 0; i < LEVELS.length; i++) {
    const chapter = Math.floor(i / 6);
    const local = i % 6;
    const px = 34 + chapter * 646;
    const py = 205 + local * 271;
    const row = await rect(board, `LevelSpec/${LEVELS[i][0]}`, px, py, 612, 235, C.cream2, 20);
    await stroke(row, i === 0 ? C.coral : '#DBA560', i === 0 ? 4 : 2);
    await ellipse(board, `LevelSpec/${LEVELS[i][0]}/Badge`, px + 20, py + 19, 54, 54, i === 0 ? C.coral : C.wood2);
    await centerText(board, `LevelSpec/${LEVELS[i][0]}/Number`, LEVELS[i][0], px + 47, py + 46, 18, C.white, 'ExtraBold');
    await text(board, `LevelSpec/${LEVELS[i][0]}/Name`, LEVELS[i][1], px + 90, py + 20, 19, C.ink, 'ExtraBold');
    await text(board, `LevelSpec/${LEVELS[i][0]}/Data`, `阵容 ${LEVELS[i][2]}   ·   速度 ${LEVELS[i][3]}   ·   机制 ${LEVELS[i][4]}`, px + 90, py + 59, 13, C.muted, 'SemiBold');
    await text(board, `LevelSpec/${LEVELS[i][0]}/Stars`, `三星阈值：${LEVELS[i][5]}`, px + 22, py + 108, 13, C.wood, 'SemiBold');
    await text(board, `LevelSpec/${LEVELS[i][0]}/Goal`, i === 0 ? '目标：首次发射 ≤8秒；首次消除 ≤15秒；45秒内完成。' : '目标：保持短局节奏，优先制造可读连锁与呼噜高潮。', px + 22, py + 148, 13, C.muted, 'Regular');
    await text(board, `LevelSpec/${LEVELS[i][0]}/QA`, i === 0 ? 'QA：5 种猫同时可见，猫中心误差 ≤4px，必定提供第一组三连。' : 'QA：无死局；失败可理解；道具非强制；广告不打断首局。', px + 22, py + 188, 12, i === 0 ? C.coralDark : C.muted, 'SemiBold');
  }
  return board;
}

async function buildPrototypeBoard(sectionId) {
  const board = await frame(sectionId, 'MMHW/V2/07_Prototype_Interactions', 4240, 3520, 1260, 1020, '#FFF9EC');
  await text(board, 'Heading', '07 · 交互与原型说明', 34, 27, 28, C.ink, 'ExtraBold');
  const lines = [
    ['启动完成', '自动进入首页', '300ms 淡入'], ['继续第1关', '开局准备', '按下80ms'], ['开始游戏', '核心游戏', '200ms 推入'],
    ['暂停', '暂停弹窗', '覆盖当前局'], ['继续游戏', '关闭暂停', '返回当前局'], ['失败复活', '原地继续', '后退6格'],
    ['胜利下一关', '返回地图', '高亮下一关'], ['关卡/图鉴/外观', '对应页面', '保留首页状态'], ['分享完成', '返回高光卡', '无阻断'],
  ];
  for (let i = 0; i < lines.length; i++) {
    const py = 112 + i * 78;
    await rect(board, `Interaction/${i + 1}`, 34, py, 1192, 60, i % 2 ? '#F7EEDF' : '#FFF5E5', 14);
    await text(board, `Interaction/${i + 1}/From`, lines[i][0], 54, py + 17, 14, C.ink, 'ExtraBold');
    await centerText(board, `Interaction/${i + 1}/Arrow`, '→', 360, py + 30, 20, C.wood, 'ExtraBold');
    await text(board, `Interaction/${i + 1}/To`, lines[i][1], 407, py + 17, 14, C.coralDark, 'SemiBold');
    await text(board, `Interaction/${i + 1}/Motion`, lines[i][2], 840, py + 17, 13, C.muted, 'Regular');
  }
  await text(board, 'Note', '实际可点击热区已经绑定在页面按钮 Body 上；所有热区 ≥44pt。', 34, 866, 15, C.purpleDark, 'SemiBold');
  return board;
}

async function buildHandoff(sectionId) {
  const board = await frame(sectionId, 'MMHW/V2/08_Dev_Handoff', 5540, 3520, 1460, 1020, '#FFF9EC');
  await text(board, 'Heading', '08 · 开发交付标注（待验收）', 34, 27, 28, C.ink, 'ExtraBold');
  await text(board, 'Status', '当前状态：仅 Figma 审核；Cocos 重构暂停。', 34, 73, 16, C.coralDark, 'ExtraBold');
  await text(board, 'Spec', 'Figma 375×667 → Cocos 逻辑分辨率 750×1334，坐标尺寸 ×2。\n背景等比 COVER；顶部安全区 44pt；底部安全区 34pt；右上避让抖音胶囊。', 34, 114, 15, C.muted, 'Regular');
  await text(board, 'LayersTitle', '运行时图层', 34, 206, 18, C.ink, 'ExtraBold');
  const rows = [['100', '弹窗 / Toast / 合规'], ['80', 'HUD / 道具 / 发射器'], ['60', '回窝粒子 / 连击飘字'], ['40', '动态猫咪 / 弹射物'], ['20', '无UI场景底图']];
  for (let i = 0; i < rows.length; i++) {
    const py = 247 + i * 61;
    const pill = await rect(board, `Layer/${rows[i][0]}`, 34, py, 618, 45, C.cream, 18);
    await stroke(pill, '#D8A05A', 2);
    await centerText(board, `Layer/${rows[i][0]}/Z`, rows[i][0], 78, py + 22.5, 13, C.coralDark, 'ExtraBold');
    await text(board, `Layer/${rows[i][0]}/Name`, rows[i][1], 126, py + 12, 14, C.ink, 'SemiBold');
  }
  await text(board, 'AssetsTitle', '正式资源', 720, 206, 18, C.ink, 'ExtraBold');
  await text(board, 'Assets', 'art/final/home_background.png\nart/final/gameplay_background.png\nassets/game/art/cats/cat_{5种}.png\nart/final/icons/icon_{9种}.png\n字体：WenYuan Rounded SC VF', 720, 247, 15, C.muted, 'Regular');
  await text(board, 'AcceptanceTitle', '进入 Cocos 前的验收门槛', 720, 435, 18, C.ink, 'ExtraBold');
  await text(board, 'Acceptance', '□ 产品负责人明确验收 Figma\n□ 13 个页面无缺失\n□ 24 关内容表完整\n□ 组件全部状态齐全\n□ 第一关猫中心误差 ≤4px\n□ 字体、字重、居中逐页通过\n□ 375×667 全屏无越界\n□ 原型热区可点击且返回路径完整', 720, 478, 15, C.ink, 'SemiBold');
  await text(board, 'Ban', '未满足以上全部条件，不允许开始 Cocos。', 720, 793, 17, C.coralDark, 'ExtraBold');
  return board;
}

function navigateReaction(destinationId, transition = 'DISSOLVE') {
  return [{
    trigger: { type: 'ON_CLICK' },
    action: {
      type: 'NODE', destinationId, navigation: 'NAVIGATE', preserveScrollPosition: false,
      transition: { type: transition, duration: 0.22, easing: { type: 'EASE_OUT' } },
    },
  }];
}

function backReaction() {
  return [{ trigger: { type: 'ON_CLICK' }, action: { type: 'BACK' } }];
}

async function safeReaction(nodeId, reactions) {
  try {
    await call('set_reactions', { nodeId, reactions, mode: 'replace' });
    return true;
  } catch (error) {
    console.log(`reaction-warning ${nodeId}: ${error.message}`);
    return false;
  }
}

async function buildQaBoard(sectionId, screens) {
  const board = await frame(sectionId, 'MMHW/V2/09_QA_Visual_Comparison', 7040, 3520, 2000, 2050, '#F5EADB');
  await text(board, 'Heading', '09 · 视觉 QA 对照与验收记录', 34, 27, 28, C.ink, 'ExtraBold');
  await text(board, 'Caption', '左侧为 ImageGen 母版，右侧为当前 V2 Figma 实现；重点检查轨道中心、字体、居中、比例与安全区。', 34, 70, 15, C.muted, 'Regular');
  await text(board, 'HomeLabel', '首页：母版 / Figma V2', 34, 115, 17, C.ink, 'ExtraBold');
  await image(board, 'Compare/Home/Master', 'art/final/home_master.png', 34, 154, 345, 613, 'FIT');
  await image(board, 'Compare/Home/Figma', 'art/qa/figma-v2-review-home.png', 410, 154, 345, 613, 'FIT');
  await text(board, 'GameplayLabel', '第一关：母版 / Figma V2', 793, 115, 17, C.ink, 'ExtraBold');
  await image(board, 'Compare/Gameplay/Master', 'art/final/gameplay_master.png', 793, 154, 345, 613, 'FIT');
  await image(board, 'Compare/Gameplay/Figma', 'art/qa/figma-v2-review-gameplay.png', 1169, 154, 345, 613, 'FIT');
  const checklist = await rect(board, 'QA/ChecklistPanel', 1548, 115, 418, 652, C.cream2, 24);
  await stroke(checklist, '#D89E58', 2);
  await text(board, 'QA/ChecklistTitle', '首轮硬性检查', 1576, 148, 19, C.coralDark, 'ExtraBold');
  await text(board, 'QA/Checklist', '✓ 直接修改 V2，无 V3\n✓ 13 个页面齐全\n✓ 24 关内容齐全\n✓ 5 种猫首关同屏\n✓ 猫按四段轨道中心排列\n✓ 文渊圆体全局生效\n✓ 标题/按钮按真实边界居中\n✓ 正式鱼、设置、导航、道具图标\n✓ 暂停/胜利/失败/通用状态齐全\n✓ Cocos 仍为暂停状态\n\n待产品负责人：逐页视觉验收', 1576, 194, 15, C.ink, 'SemiBold');
  await text(board, 'ResultsLabel', '结算与其余上线页面', 34, 819, 17, C.ink, 'ExtraBold');
  const resultPaths = [
    ['Win', 'art/qa/figma-v2-review-win.png'], ['Fail', 'art/qa/figma-v2-review-fail.png'], ['Map', 'art/qa/figma-v2-review-map.png'],
    ['Prepare', 'art/qa/figma-v2-review-prepare.png'], ['Pause', 'art/qa/figma-v2-review-pause.png'], ['Collection', 'art/qa/figma-v2-review-collection.png'],
    ['Cosmetics', 'art/qa/figma-v2-review-cosmetics.png'], ['Settings', 'art/qa/figma-v2-review-settings.png'],
  ];
  for (let i = 0; i < resultPaths.length; i++) {
    const col = i % 8;
    const px = 34 + col * 241;
    await image(board, `Other/${resultPaths[i][0]}`, resultPaths[i][1], px, 862, 217, 386, 'FIT');
    await centerText(board, `Other/${resultPaths[i][0]}/Label`, resultPaths[i][0], px + 108.5, 1272, 13, C.ink, 'SemiBold');
  }
  await text(board, 'QA/MethodTitle', '逐页 QA 方法', 34, 1340, 18, C.ink, 'ExtraBold');
  await text(board, 'QA/Method', '1. 轨道：猫咪圆心必须落在奶油轨道内侧中心线，允许误差 ≤4px。\n2. 字体：扫描全部 TEXT，只允许 WenYuan Rounded SC VF。\n3. 居中：主标题、按钮、弹窗数字以容器中心差 ≤1px 为准。\n4. 安全区：顶部 44pt、底部 34pt、右上胶囊区域不得放关键操作。\n5. 对照：母版决定氛围、材质和层级；Figma 保证可编辑与可实现。\n6. 状态：加载、失败、广告不可用、离线、锁定、禁用均必须可达。', 34, 1384, 15, C.muted, 'Regular');
  await text(board, 'QA/Signoff', '产品负责人验收：□ 通过  □ 需修改     日期：__________     备注：____________________________', 34, 1749, 17, C.coralDark, 'ExtraBold');
  return board;
}

async function deleteCurrentV2Children() {
  const section = await call('get_node', { nodeId: SECTION_ID });
  if (section.name !== '喵喵回窝 / Release V2') throw new Error(`Unexpected target: ${section.name}`);
  const childIds = (section.children ?? []).map((node) => node.id).filter(Boolean);
  if (childIds.length) await call('delete_nodes', { nodeIds: childIds });
  await call('resize_nodes', { nodeIds: [SECTION_ID], width: 9200, height: 5800 });
  return childIds;
}

const CURRENT_SCREEN_IDS = {
  loading: '369:1302', home: '369:1324', map: '369:1364', prepare: '369:1435', gameplay: '369:1476',
  pause: '369:1539', win: '369:1566', fail: '369:1601', collection: '369:1633', cosmetics: '369:1690',
  settings: '369:1736', states: '369:1767', share: '369:1795',
};

async function exportReviewScreens(screens) {
  const qaDir = '/Users/limingrui/IdeaProjects/miaomiaozuma/art/qa';
  await call('save_screenshots', { items: [
    { nodeId: screens.home.screen, outputPath: `${qaDir}/figma-v2-review-home.png`, format: 'PNG', scale: 2 },
    { nodeId: screens.gameplay.screen, outputPath: `${qaDir}/figma-v2-review-gameplay.png`, format: 'PNG', scale: 2 },
    { nodeId: screens.map.screen, outputPath: `${qaDir}/figma-v2-review-map.png`, format: 'PNG', scale: 2 },
    { nodeId: screens.prepare.screen, outputPath: `${qaDir}/figma-v2-review-prepare.png`, format: 'PNG', scale: 2 },
    { nodeId: screens.pause.screen, outputPath: `${qaDir}/figma-v2-review-pause.png`, format: 'PNG', scale: 2 },
    { nodeId: screens.win.screen, outputPath: `${qaDir}/figma-v2-review-win.png`, format: 'PNG', scale: 2 },
    { nodeId: screens.fail.screen, outputPath: `${qaDir}/figma-v2-review-fail.png`, format: 'PNG', scale: 2 },
    { nodeId: screens.collection.screen, outputPath: `${qaDir}/figma-v2-review-collection.png`, format: 'PNG', scale: 2 },
    { nodeId: screens.cosmetics.screen, outputPath: `${qaDir}/figma-v2-review-cosmetics.png`, format: 'PNG', scale: 2 },
    { nodeId: screens.settings.screen, outputPath: `${qaDir}/figma-v2-review-settings.png`, format: 'PNG', scale: 2 },
  ] });
  return qaDir;
}

async function qaOnly() {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'codex-miaomiaozuma-v2-qa', version: '2.1.0' } });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
  const metadata = await call('get_metadata');
  if (metadata.currentPageId !== '11:7101') throw new Error(`Wrong Figma page: ${metadata.currentPageId} ${metadata.currentPageName}`);
  const screens = Object.fromEntries(Object.entries(CURRENT_SCREEN_IDS).map(([key, screen]) => [key, { screen }]));
  console.log('qa 1/3: exporting fresh V2 review screenshots');
  const qaDir = await exportReviewScreens(screens);
  const existing = await call('search_nodes', { query: 'MMHW/V2/09_QA_Visual_Comparison', nodeId: SECTION_ID, limit: 10 });
  const qaIds = (existing.nodes ?? []).filter((node) => node.name === 'MMHW/V2/09_QA_Visual_Comparison').map((node) => node.id);
  if (qaIds.length) await call('delete_nodes', { nodeIds: qaIds });
  console.log('qa 2/3: rebuilding the in-file comparison board with fresh exports');
  await buildQaBoard(SECTION_ID, screens);
  await call('save_screenshots', { items: [
    { nodeId: SECTION_ID, outputPath: `${qaDir}/figma-release-v2-review.png`, format: 'PNG', scale: 0.35 },
  ] });
  console.log('qa 3/3: review exports ready');
}

async function main() {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'codex-miaomiaozuma-v2-repair', version: '2.1.0' } });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
  const metadata = await call('get_metadata');
  if (metadata.currentPageId !== '11:7101') throw new Error(`Wrong Figma page: ${metadata.currentPageId} ${metadata.currentPageName}`);

  console.log('stage 1/8: replacing existing V2 children in place');
  const deleted = await deleteCurrentV2Children();
  await text(SECTION_ID, 'MMHW/V2/SectionTitle', '喵喵回窝 · Release V2 完整交互设计', 80, 46, 43, C.ink, 'ExtraBold');
  await text(SECTION_ID, 'MMHW/V2/SectionMeta', 'ImageGen 视觉母版 → Figma 全页面与交互验收 → 负责人通过后才允许 Cocos 重构', 82, 107, 18, C.coralDark, 'SemiBold');
  await text(SECTION_ID, 'MMHW/V2/Status', '当前：Figma 审核中 · Cocos 暂停', 7260, 57, 22, C.purpleDark, 'ExtraBold');

  console.log('stage 2/8: rebuilding visual reference and foundations');
  await buildReference(SECTION_ID);
  await buildFoundations(SECTION_ID);

  console.log('stage 3/8: rebuilding full component library');
  await buildComponents(SECTION_ID);

  console.log('stage 4/8: rebuilding all 13 screens');
  await text(SECTION_ID, 'MMHW/V2/ScreensTitle', '04 · 全部页面（375×667，高保真可编辑）', 80, 2680, 28, C.ink, 'ExtraBold');
  const x0 = 80;
  const gap = 415;
  const screens = {};
  screens.loading = await createLoading(SECTION_ID, x0 + gap * 0, 2740);
  screens.home = await createHome(SECTION_ID, x0 + gap * 1, 2740);
  screens.map = await createMap(SECTION_ID, x0 + gap * 2, 2740);
  screens.prepare = await createPrepare(SECTION_ID, x0 + gap * 3, 2740);
  screens.gameplay = await createGameplay(SECTION_ID, x0 + gap * 4, 2740);
  screens.pause = await createPause(SECTION_ID, x0 + gap * 5, 2740);
  screens.win = await createResult(SECTION_ID, x0 + gap * 6, 2740, true);
  screens.fail = await createResult(SECTION_ID, x0 + gap * 7, 2740, false);
  screens.collection = await createCollection(SECTION_ID, x0 + gap * 8, 2740);
  screens.cosmetics = await createCosmetics(SECTION_ID, x0 + gap * 9, 2740);
  screens.settings = await createSettings(SECTION_ID, x0 + gap * 10, 2740);
  screens.states = await createCommonStates(SECTION_ID, x0 + gap * 11, 2740);
  screens.share = await createShare(SECTION_ID, x0 + gap * 12, 2740);

  console.log('stage 5/8: documenting flow, 24 levels, prototype and handoff');
  await buildUserFlow(SECTION_ID, screens);
  await buildLevelContent(SECTION_ID);
  await buildPrototypeBoard(SECTION_ID);
  await buildHandoff(SECTION_ID);

  console.log('stage 6/8: binding clickable prototype interactions');
  let reactionCount = 0;
  reactionCount += await safeReaction(screens.home.continueHit, navigateReaction(screens.prepare.screen, 'SMART_ANIMATE'));
  reactionCount += await safeReaction(screens.home.settings, navigateReaction(screens.settings.screen));
  reactionCount += await safeReaction(screens.home.map, navigateReaction(screens.map.screen));
  reactionCount += await safeReaction(screens.home.collection, navigateReaction(screens.collection.screen));
  reactionCount += await safeReaction(screens.home.cosmetic, navigateReaction(screens.cosmetics.screen));
  reactionCount += await safeReaction(screens.map.challenge, navigateReaction(screens.prepare.screen, 'SMART_ANIMATE'));
  reactionCount += await safeReaction(screens.prepare.start, navigateReaction(screens.gameplay.screen, 'SMART_ANIMATE'));
  reactionCount += await safeReaction(screens.gameplay.pause, navigateReaction(screens.pause.screen));
  reactionCount += await safeReaction(screens.pause.resume, navigateReaction(screens.gameplay.screen));
  reactionCount += await safeReaction(screens.pause.restart, navigateReaction(screens.gameplay.screen));
  reactionCount += await safeReaction(screens.pause.map, navigateReaction(screens.map.screen));
  reactionCount += await safeReaction(screens.win.primary, navigateReaction(screens.map.screen, 'SMART_ANIMATE'));
  reactionCount += await safeReaction(screens.win.secondary, navigateReaction(screens.gameplay.screen));
  reactionCount += await safeReaction(screens.fail.primary, navigateReaction(screens.gameplay.screen, 'SMART_ANIMATE'));
  reactionCount += await safeReaction(screens.fail.secondary, navigateReaction(screens.gameplay.screen));
  reactionCount += await safeReaction(screens.fail.map, navigateReaction(screens.map.screen));
  for (const item of [screens.map, screens.prepare, screens.collection, screens.cosmetics, screens.settings]) {
    reactionCount += await safeReaction(item.back, backReaction());
  }
  reactionCount += await safeReaction(screens.settings.save, navigateReaction(screens.home.screen));
  reactionCount += await safeReaction(screens.share.close, backReaction());

  console.log('stage 7/8: exporting page screenshots for visual QA');
  const qaDir = await exportReviewScreens(screens);
  await buildQaBoard(SECTION_ID, screens);
  await call('save_screenshots', { items: [
    { nodeId: SECTION_ID, outputPath: `${qaDir}/figma-release-v2-review.png`, format: 'PNG', scale: 0.35 },
  ] });

  console.log('stage 8/8: finished');
  console.log(JSON.stringify({ sectionId: SECTION_ID, deleted: deleted.length, screens: Object.fromEntries(Object.entries(screens).map(([key, value]) => [key, value.screen])), reactionCount }, null, 2));
}

const runner = process.argv.includes('--qa-only') ? qaOnly : main;
runner()
  .then(() => child.kill('SIGTERM'))
  .catch((error) => {
    console.error(error.stack ?? error.message);
    child.kill('SIGTERM');
    process.exitCode = 1;
  });
