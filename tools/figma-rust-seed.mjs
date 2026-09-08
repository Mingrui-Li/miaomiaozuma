#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import readline from 'node:readline';

const binary = '/Users/limingrui/.codex/tools/figma-mcp-rust/0.2.0/node_modules/@alvinindra/figma-mcp-rust/bin/darwin-x64/figma-mcp-rust';
const child = spawn(binary, ['--ip', '127.0.0.1', '--port', '1994'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

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
  } catch {
    // Server logs are written to stderr; ignore non-JSON stdout defensively.
  }
});

function rpc(method, params = {}) {
  const id = nextId++;
  const promise = new Promise((resolve) => pending.set(id, resolve));
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  return promise;
}

function parseToolResult(response) {
  const result = response?.result;
  if (!result || result.isError) {
    throw new Error(result?.content?.[0]?.text ?? JSON.stringify(response));
  }
  const text = result.content?.[0]?.text ?? '{}';
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

async function call(name, args = {}) {
  return parseToolResult(await rpc('tools/call', { name, arguments: args }));
}

function nodeId(result) {
  return result.id ?? result.nodeId ?? result.node?.id ?? result.createdNode?.id;
}

async function frame(parentId, name, x, y, width, height, fillColor = '#FFF8EE') {
  const result = await call('create_frame', { parentId, name, x, y, width, height, fillColor });
  return nodeId(result);
}

async function rect(parentId, name, x, y, width, height, fillColor, cornerRadius = 0) {
  const result = await call('create_rectangle', {
    parentId, name, x, y, width, height, fillColor, cornerRadius,
  });
  return nodeId(result);
}

async function ellipse(parentId, name, x, y, width, height, fillColor) {
  const result = await call('create_ellipse', { parentId, name, x, y, width, height, fillColor });
  return nodeId(result);
}

async function label(parentId, name, text, x, y, fontSize, fillColor = '#3E2C2A', fontStyle = 'Regular') {
  const result = await call('create_text', {
    parentId, name, text, x, y, fontSize, fillColor, fontFamily: 'Inter', fontStyle,
  });
  return nodeId(result);
}

async function catToken(parentId, name, x, y, color, face = '•ᴗ•') {
  const body = await ellipse(parentId, `${name}/Head`, x, y, 42, 42, color);
  const earL = await rect(parentId, `${name}/Ear-L`, x + 4, y - 3, 12, 14, color, 3);
  const earR = await rect(parentId, `${name}/Ear-R`, x + 26, y - 3, 12, 14, color, 3);
  await call('rotate_nodes', { nodeIds: [earL], rotation: 45 });
  await call('rotate_nodes', { nodeIds: [earR], rotation: -45 });
  await label(parentId, `${name}/Face`, face, x + 7, y + 10, 13, '#3E2C2A', 'Medium');
  return body;
}

async function button(parentId, name, text, x, y, width, color = '#FF8A65') {
  const background = await rect(parentId, `${name}/Background`, x, y, width, 48, color, 24);
  await call('set_effects', {
    nodeId: background,
    effects: [{ type: 'DROP_SHADOW', color: '#8B4E3D', opacity: 0.22, offsetX: 0, offsetY: 5, radius: 8, spread: 0 }],
  });
  await label(parentId, `${name}/Label`, text, x + 24, y + 13, 17, '#FFFFFF', 'Bold');
  return background;
}

async function importImage(parentId, path, name, x, y, width, height) {
  const data = (await readFile(path)).toString('base64');
  const result = await call('import_image', {
    parentId, imageData: data, name, x, y, width, height, scaleMode: 'FIT',
  });
  return nodeId(result);
}

async function createTokens() {
  const collection = await call('create_variable_collection', {
    name: 'MMHW / Core', initialModeName: 'Default',
  });
  const collectionId = collection.id ?? collection.collectionId;
  const variables = [
    ['color/bg-cream', 'COLOR', '#FFF8EE'],
    ['color/coral', 'COLOR', '#FF8A65'],
    ['color/mint', 'COLOR', '#66C7A5'],
    ['color/ink', 'COLOR', '#3E2C2A'],
    ['color/gold', 'COLOR', '#FFD166'],
    ['radius/card', 'FLOAT', '24'],
    ['space/base', 'FLOAT', '8'],
  ];
  for (const [name, type, value] of variables) {
    await call('create_variable', { collectionId, name, type, value });
  }
  await call('create_text_style', {
    name: 'MMHW / Title', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 32,
    lineHeightUnit: 'PIXELS', lineHeightValue: 40,
    description: '喵喵回窝主标题；中文落地使用系统圆体/思源黑体。',
  });
  await call('create_text_style', {
    name: 'MMHW / Body', fontFamily: 'Inter', fontStyle: 'Medium', fontSize: 16,
    lineHeightUnit: 'PIXELS', lineHeightValue: 24,
    description: '正文与按钮文字。',
  });
  await call('create_effect_style', {
    name: 'MMHW / Soft Card', type: 'DROP_SHADOW', color: '#8B4E3D', opacity: 0.16,
    offsetX: 0, offsetY: 6, radius: 18, spread: 0,
    description: '卡片柔和投影。',
  });
}

async function createHome(sectionId, x, y) {
  const screen = await frame(sectionId, 'MMHW/P01 首页', x, y, 375, 667, '#FFF8EE');
  await ellipse(screen, 'Sun Glow', 58, 72, 260, 260, '#FFE6A7');
  await label(screen, 'Eyebrow', '治愈系猫猫祖玛', 114, 54, 13, '#A56A55', 'Medium');
  await label(screen, 'Title', '喵喵回窝', 83, 83, 36, '#6B3F36', 'Bold');
  await label(screen, 'Subtitle', '把走丢的小猫送回温暖的家', 77, 133, 15, '#815D54', 'Medium');
  await catToken(screen, 'Hero/Orange', 166, 207, '#F6A45B', 'ᵔᴗᵔ');
  await catToken(screen, 'Hero/Blue', 116, 254, '#7EA7C9', '•ᴗ•');
  await catToken(screen, 'Hero/Calico', 216, 254, '#E7B06B', '˘ᴗ˘');
  const card = await rect(screen, 'Progress Card', 28, 350, 319, 105, '#FFFFFF', 24);
  await call('set_effects', { nodeId: card, effects: [{ type: 'DROP_SHADOW', color: '#8B4E3D', opacity: 0.14, offsetX: 0, offsetY: 5, radius: 16, spread: 0 }] });
  await label(screen, 'Continue Label', '继续闯关', 52, 371, 14, '#A56A55', 'Medium');
  await label(screen, 'Level Value', '第 1 关 · 温暖小院', 52, 397, 19, '#3E2C2A', 'Bold');
  await label(screen, 'Best Score', '最高 12,680', 226, 373, 12, '#815D54', 'Medium');
  await button(screen, 'Primary CTA', '开始送猫猫回窝', 55, 487, 265, '#FF8A65');
  await button(screen, 'Secondary CTA', '每日挑战', 93, 552, 189, '#66C7A5');
  await label(screen, 'Footer', '图鉴  8/20   ·   设置', 117, 625, 12, '#A78980', 'Medium');
  return screen;
}

async function createGameplay(sectionId, x, y) {
  const screen = await frame(sectionId, 'MMHW/P02 第1关玩法', x, y, 375, 667, '#F7E8C8');
  await rect(screen, 'Top Bar', 0, 0, 375, 78, '#FFF8EE', 0);
  await label(screen, 'Back', '‹', 20, 18, 34, '#6B3F36', 'Bold');
  await label(screen, 'Level', '第 1 关', 75, 21, 17, '#3E2C2A', 'Bold');
  await label(screen, 'Goal', '送 36 只猫猫回窝', 75, 45, 11, '#815D54', 'Medium');
  await label(screen, 'Score', '12,680', 279, 23, 17, '#3E2C2A', 'Bold');
  await label(screen, 'Combo', '连击 x4', 294, 48, 11, '#FF6F61', 'Bold');
  await rect(screen, 'Purr Meter BG', 28, 92, 319, 20, '#FFFFFF', 10);
  await rect(screen, 'Purr Meter Fill', 31, 95, 212, 14, '#FFD166', 7);
  await label(screen, 'Purr Label', '呼噜值  68%', 145, 94, 11, '#6B3F36', 'Bold');

  const track = await rect(screen, 'Track/Outer', 41, 145, 293, 326, '#E7CFA6', 145);
  await call('set_strokes', { nodeId: track, color: '#C4A979', strokeWeight: 4 });
  await rect(screen, 'Track/Inner Cut', 95, 202, 185, 214, '#A9D8B8', 92);
  await label(screen, 'Home', '⌂', 159, 287, 42, '#FFFFFF', 'Bold');
  const catColors = ['#F6A45B', '#7EA7C9', '#E7B06B', '#514C55', '#E9D7CE'];
  const positions = [[55,176],[91,158],[131,153],[172,155],[213,164],[250,184],[277,217],[290,255],[294,296],[287,337],[271,374],[246,405],[211,426],[170,438],[128,435],[91,420]];
  for (let i = 0; i < positions.length; i++) {
    const [cx, cy] = positions[i];
    await catToken(screen, `Chain/Cat-${String(i + 1).padStart(2, '0')}`, cx, cy, catColors[i % catColors.length]);
  }
  await rect(screen, 'Danger Marker', 45, 145, 66, 9, '#FF6F61', 4);
  await label(screen, 'Hint', '相同猫猫连成 3 只即可回窝', 95, 492, 12, '#815D54', 'Medium');
  await ellipse(screen, 'Launcher/Base', 139, 520, 98, 98, '#FFFFFF');
  await catToken(screen, 'Launcher/Current', 167, 541, '#F6A45B', '•̀ᴗ•́');
  await label(screen, 'Next Label', '下一只', 268, 527, 11, '#815D54', 'Medium');
  await catToken(screen, 'Launcher/Next', 275, 550, '#7EA7C9');
  await label(screen, 'Booster', '↻ 交换', 30, 611, 13, '#6B3F36', 'Bold');
  await label(screen, 'Aim', '拖动瞄准 · 松手发射', 121, 625, 12, '#815D54', 'Medium');
  await label(screen, 'Pause', 'Ⅱ', 326, 614, 19, '#6B3F36', 'Bold');
  return screen;
}

async function createResult(sectionId, x, y, victory) {
  const suffix = victory ? '胜利' : '失败复活';
  const screen = await frame(sectionId, `MMHW/${victory ? 'P04' : 'P05'} ${suffix}`, x, y, 375, 667, victory ? '#FFF3D5' : '#EDE7F3');
  await ellipse(screen, 'Glow', 63, 58, 249, 249, victory ? '#FFD166' : '#CFC3DD');
  await catToken(screen, 'Hero Cat', 166, 120, victory ? '#F6A45B' : '#7EA7C9', victory ? '♥ᴗ♥' : '；︿；');
  await label(screen, 'Title', victory ? '全员回窝！' : '猫猫快迷路啦', victory ? 103 : 83, 203, 31, '#5E3B34', 'Bold');
  await label(screen, 'Subtitle', victory ? '呼噜声响彻整个小院' : '再给它们一次机会吧', victory ? 101 : 104, 247, 14, '#815D54', 'Medium');
  const card = await rect(screen, 'Result Card', 32, 292, 311, 151, '#FFFFFF', 24);
  await call('set_effects', { nodeId: card, effects: [{ type: 'DROP_SHADOW', color: '#6B3F36', opacity: 0.15, offsetX: 0, offsetY: 6, radius: 18, spread: 0 }] });
  await label(screen, 'Main Value', victory ? '12,680' : '还差 7 只', victory ? 118 : 123, 321, 30, '#3E2C2A', 'Bold');
  await label(screen, 'Main Label', victory ? '本关得分' : '即可全部回窝', victory ? 156 : 144, 361, 12, '#A56A55', 'Medium');
  await label(screen, 'Stats', victory ? '最高连击  9   ·   3 星通关' : '观看短视频，猫链后退 6 格', victory ? 78 : 77, 401, 13, '#815D54', 'Medium');
  await button(screen, 'Primary CTA', victory ? '下一关' : '免费复活', 72, 482, 231, victory ? '#FF8A65' : '#7E68A5');
  await button(screen, 'Secondary CTA', victory ? '再玩一次' : '重新开始', 102, 547, 171, '#66C7A5');
  await label(screen, 'Tertiary CTA', victory ? '返回首页' : '暂时离开', 157, 620, 12, '#815D54', 'Medium');
  return screen;
}

async function finishExisting(sectionId) {
  const p05Search = await call('search_nodes', {
    query: 'MMHW/P05 失败复活', nodeId: sectionId, limit: 5,
  });
  const p05 = (p05Search.nodes ?? [])[0];
  if (!p05) throw new Error('Cannot find the partial P05 frame.');
  const existingText = await call('search_nodes', {
    query: '免费复活', nodeId: p05.id, limit: 5,
  });
  if ((existingText.nodes ?? []).length === 0) {
    const cardSearch = await call('search_nodes', {
      query: 'Result Card', nodeId: p05.id, limit: 5,
    });
    const card = (cardSearch.nodes ?? [])[0];
    if (card) {
      await call('set_effects', { nodeId: card.id, effects: [{ type: 'DROP_SHADOW', color: '#6B3F36', opacity: 0.15, offsetX: 0, offsetY: 6, radius: 18, spread: 0 }] });
    }
    await label(p05.id, 'Main Value', '还差 7 只', 123, 321, 30, '#3E2C2A', 'Bold');
    await label(p05.id, 'Main Label', '即可全部回窝', 144, 361, 12, '#A56A55', 'Medium');
    await label(p05.id, 'Stats', '观看短视频，猫链后退 6 格', 77, 401, 13, '#815D54', 'Medium');
    await button(p05.id, 'Primary CTA', '免费复活', 72, 482, 231, '#7E68A5');
    await button(p05.id, 'Secondary CTA', '重新开始', 102, 547, 171, '#66C7A5');
    await label(p05.id, 'Tertiary CTA', '暂时离开', 157, 620, 12, '#815D54', 'Medium');
  }

  const boardSearch = await call('search_nodes', {
    query: 'MMHW/03 组件与开发标注', nodeId: sectionId, limit: 5,
  });
  let componentBoard = (boardSearch.nodes ?? [])[0]?.id;
  if (!componentBoard) {
    componentBoard = await frame(sectionId, 'MMHW/03 组件与开发标注', 1780, 1520, 820, 667, '#FFFFFF');
    await label(componentBoard, 'Component Title', '03 · 组件与开发标注', 36, 34, 24, '#3E2C2A', 'Bold');
    await label(componentBoard, 'Component Intro', '以下尺寸均按 375×667 设计稿；Cocos 中使用 750×1334 设计分辨率，数值 ×2。', 36, 76, 14, '#815D54', 'Medium');
    await button(componentBoard, 'Button/Primary', '主按钮 · Default', 36, 126, 250, '#FF8A65');
    await button(componentBoard, 'Button/Success', '成功按钮 · Default', 316, 126, 250, '#66C7A5');
    const colors = ['#F6A45B','#E9D7CE','#7EA7C9','#E7B06B','#514C55'];
    const names = ['橘猫','布偶','蓝猫','三花','黑猫'];
    for (let i = 0; i < 5; i++) {
      await catToken(componentBoard, `CatToken/${names[i]}`, 42 + i * 132, 235, colors[i]);
      await label(componentBoard, `CatName/${names[i]}`, names[i], 44 + i * 132, 287, 12, '#6B514B', 'Bold');
    }
    await label(componentBoard, 'Motion Title', '动效节奏', 36, 356, 18, '#3E2C2A', 'Bold');
    await label(componentBoard, 'Motion Body', '命中 90ms → 消除蓄力 120ms → 回窝爆发 220ms → 猫链回弹 180ms\n呼噜狂欢：0.35s 进场 / 6s 持续 / 0.25s 退场；低端机只降粒子，不降输入响应。', 36, 389, 14, '#6B514B', 'Medium');
    await label(componentBoard, 'Safe Area Title', '安全区与交互', 36, 486, 18, '#3E2C2A', 'Bold');
    await label(componentBoard, 'Safe Area Body', '顶部预留 44pt，底部预留 34pt；发射区位于底部 160pt 内。\n按钮最小 48×48pt；瞄准手势允许 12pt 容错；暂停时冻结计时与猫链。', 36, 519, 14, '#6B514B', 'Medium');
  }
  console.log(JSON.stringify({ sectionId, p05: p05.id, componentBoard }));
}

async function main() {
  await rpc('initialize', {
    protocolVersion: '2025-03-26', capabilities: {},
    clientInfo: { name: 'codex-miaomiaozuma-seed', version: '1.0.0' },
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);

  const metadata = await call('get_metadata');
  if (metadata.currentPageId !== '11:7101') {
    throw new Error(`Wrong page selected: ${metadata.currentPageId} ${metadata.currentPageName}`);
  }
  if (process.argv.includes('--resume')) {
    await finishExisting('358:304');
    return;
  }
  const existing = await call('search_nodes', { query: 'MMHW/', nodeId: '11:7101', limit: 10 });
  if ((existing.nodes ?? existing.results ?? []).length > 0) {
    throw new Error('MMHW nodes already exist; refusing to create a duplicate section.');
  }

  await createTokens();
  const sectionResult = await call('create_section', {
    name: '喵喵回窝 / MVP', x: 26750, y: 0, width: 4600, height: 3600,
  });
  const sectionId = nodeId(sectionResult);
  await label(sectionId, 'MMHW/Section Title', '喵喵回窝 · MVP 设计交付', 80, 70, 42, '#3E2C2A', 'Bold');
  await label(sectionId, 'MMHW/Section Meta', '375×667 竖屏 · 抖音小游戏 · 5 种猫猫从第 1 关登场 · 视觉基线 v1.0', 82, 125, 16, '#815D54', 'Medium');

  const refBoard = await frame(sectionId, 'MMHW/00 视觉概念参考', 80, 190, 2050, 1210, '#F6EFE5');
  await label(refBoard, 'Reference Title', '01 · GPT Image 视觉概念（设计方向源稿）', 40, 35, 24, '#3E2C2A', 'Bold');
  await importImage(refBoard, 'art/concepts/c01_level_one_gameplay.preview.jpg', 'C01 第1关概念', 40, 90, 310, 552);
  await importImage(refBoard, 'art/concepts/c02_core_screens_board.preview.jpg', 'C02 核心页面概念', 385, 90, 930, 524);
  await importImage(refBoard, 'art/concepts/c03_five_cats_character_board.preview.jpg', 'C03 五猫角色概念', 40, 680, 1275, 850);
  const note = await rect(refBoard, 'Design Notes', 1360, 90, 640, 1020, '#FFFFFF', 24);
  await call('set_effects', { nodeId: note, effects: [{ type: 'DROP_SHADOW', color: '#6B3F36', opacity: 0.1, offsetX: 0, offsetY: 6, radius: 18, spread: 0 }] });
  await label(refBoard, 'Notes Title', '视觉落地原则', 1400, 130, 24, '#3E2C2A', 'Bold');
  const notes = [
    '• 第一眼必须看到“猫猫 + 轨道 + 回窝目标”',
    '• 奶油底色、珊瑚主按钮、薄荷绿成功反馈',
    '• 猫头轮廓大于花纹差异，缩小后仍能识别',
    '• 反馈遵循：蓄力 → 爆发 → 回落，避免廉价闪烁',
    '• 文字永远不压住猫脸与发射路径',
    '• 关键按钮高度 ≥ 48，拇指单手可触达',
  ];
  for (let i = 0; i < notes.length; i++) {
    await label(refBoard, `Note-${i + 1}`, notes[i], 1400, 195 + i * 66, 16, '#6B514B', 'Medium');
  }
  await label(refBoard, 'Palette', '核心色板', 1400, 630, 18, '#3E2C2A', 'Bold');
  const swatches = [['奶油','#FFF8EE'],['珊瑚','#FF8A65'],['薄荷','#66C7A5'],['呼噜金','#FFD166'],['深咖','#3E2C2A']];
  for (let i = 0; i < swatches.length; i++) {
    await rect(refBoard, `Swatch/${swatches[i][0]}`, 1400 + (i % 3) * 185, 675 + Math.floor(i / 3) * 100, 155, 64, swatches[i][1], 16);
    await label(refBoard, `Swatch Label/${swatches[i][0]}`, swatches[i][0], 1414 + (i % 3) * 185, 696 + Math.floor(i / 3) * 100, 13, i === 4 ? '#FFFFFF' : '#3E2C2A', 'Bold');
  }

  await label(sectionId, 'MMHW/Screens Title', '02 · 可编辑核心界面', 80, 1460, 28, '#3E2C2A', 'Bold');
  const screens = [
    await createHome(sectionId, 80, 1520),
    await createGameplay(sectionId, 505, 1520),
    await createResult(sectionId, 930, 1520, true),
    await createResult(sectionId, 1355, 1520, false),
  ];

  const componentBoard = await frame(sectionId, 'MMHW/03 组件与开发标注', 1780, 1520, 820, 667, '#FFFFFF');
  await label(componentBoard, 'Component Title', '03 · 组件与开发标注', 36, 34, 24, '#3E2C2A', 'Bold');
  await label(componentBoard, 'Component Intro', '以下尺寸均按 375×667 设计稿；Cocos 中使用 750×1334 设计分辨率，数值 ×2。', 36, 76, 14, '#815D54', 'Medium');
  await button(componentBoard, 'Button/Primary', '主按钮 · Default', 36, 126, 250, '#FF8A65');
  await button(componentBoard, 'Button/Success', '成功按钮 · Default', 316, 126, 250, '#66C7A5');
  const colors = ['#F6A45B','#E9D7CE','#7EA7C9','#E7B06B','#514C55'];
  const names = ['橘猫','布偶','蓝猫','三花','黑猫'];
  for (let i = 0; i < 5; i++) {
    await catToken(componentBoard, `CatToken/${names[i]}`, 42 + i * 132, 235, colors[i]);
    await label(componentBoard, `CatName/${names[i]}`, names[i], 44 + i * 132, 287, 12, '#6B514B', 'Bold');
  }
  await label(componentBoard, 'Motion Title', '动效节奏', 36, 356, 18, '#3E2C2A', 'Bold');
  await label(componentBoard, 'Motion Body', '命中 90ms → 消除蓄力 120ms → 回窝爆发 220ms → 猫链回弹 180ms\n呼噜狂欢：0.35s 进场 / 6s 持续 / 0.25s 退场；低端机只降粒子，不降输入响应。', 36, 389, 14, '#6B514B', 'Medium');
  await label(componentBoard, 'Safe Area Title', '安全区与交互', 36, 486, 18, '#3E2C2A', 'Bold');
  await label(componentBoard, 'Safe Area Body', '顶部预留 44pt，底部预留 34pt；发射区位于底部 160pt 内。\n按钮最小 48×48pt；瞄准手势允许 12pt 容错；暂停时冻结计时与猫链。', 36, 519, 14, '#6B514B', 'Medium');

  await call('set_reactions', {
    nodeId: screens[0], mode: 'replace', reactions: [],
  });
  console.log(JSON.stringify({ sectionId, screens, refBoard, componentBoard }));
}

try {
  await main();
} finally {
  child.kill('SIGTERM');
}
