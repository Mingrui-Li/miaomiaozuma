#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import readline from 'node:readline';

const binary = '/Users/limingrui/.codex/tools/figma-mcp-rust/0.2.0/node_modules/@alvinindra/figma-mcp-rust/bin/darwin-x64/figma-mcp-rust';
const child = spawn(binary, ['--ip', '127.0.0.1', '--port', '1994'], { stdio: ['pipe', 'pipe', 'inherit'] });
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
function idOf(value) { return value.id ?? value.nodeId ?? value.node?.id ?? value.createdNode?.id; }

const C = {
  sky: '#BFE9F4', cream: '#FFF4D8', cream2: '#FFF9EC', grass: '#B9D982',
  ink: '#4B382F', muted: '#7A6254', wood: '#A9632F', woodDark: '#63381F',
  orange: '#FF9F43', coral: '#FF6F61', coralDark: '#D94F42', mint: '#72D6B5',
  mintDark: '#3EAA88', blue: '#70B7E6', purple: '#8467B3', gold: '#FFD65A',
  white: '#FFFFFF', shade: '#2B1D1A', disabled: '#C9C1B8', danger: '#ED685C',
};

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
async function text(parentId, name, value, x, y, size, color = C.ink, style = 'Semibold') {
  return idOf(await call('create_text', { parentId, name, text: value, x, y, fontSize: size, fillColor: color, fontFamily: 'PingFang SC', fontStyle: style }));
}
async function image(parentId, name, path, x, y, width, height, scaleMode = 'FILL') {
  return idOf(await call('import_image', { parentId, name, imageData: await imageData(path), x, y, width, height, scaleMode }));
}
async function shadow(nodeId, opacity = 0.22, y = 6, radius = 10, color = C.woodDark) {
  await call('set_effects', { nodeId, effects: [{ type: 'DROP_SHADOW', color, opacity, offsetX: 0, offsetY: y, radius, spread: 0 }] });
}
async function stroke(nodeId, color = C.woodDark, weight = 2) {
  await call('set_strokes', { nodeId, color, strokeWeight: weight });
}

async function glossyButton(parentId, name, label, x, y, width, color = C.coral, dark = C.coralDark, height = 52) {
  const outer = await rect(parentId, `${name}/Shadow`, x, y + 6, width, height, dark, height / 2);
  const body = await rect(parentId, `${name}/Body`, x, y, width, height, color, height / 2);
  await stroke(body, '#F7C48D', 2);
  const shine = await rect(parentId, `${name}/Gloss`, x + 12, y + 7, width - 24, 10, '#FFFFFF66', 5);
  await text(parentId, `${name}/Label`, label, x + Math.max(18, width * 0.19), y + height * 0.25, height * 0.36, C.white, 'Semibold');
  return { outer, body, shine };
}

async function creamPill(parentId, name, x, y, width, height = 42) {
  const shadowId = await rect(parentId, `${name}/Shadow`, x, y + 4, width, height, C.woodDark, height / 2);
  const body = await rect(parentId, `${name}/Body`, x, y, width, height, C.cream, height / 2);
  await stroke(body, '#C98242', 2);
  return { shadowId, body };
}

const catPath = (name) => `assets/game/art/cats/cat_${name}.png`;
async function cat(parentId, name, type, x, y, size) {
  return image(parentId, name, catPath(type), x, y, size, size, 'FIT');
}

async function woodTitle(parentId, label, x, y, width, height = 70) {
  const back = await rect(parentId, 'Title/Shadow', x, y + 7, width, height, C.woodDark, 24);
  const board = await rect(parentId, 'Title/Wood', x, y, width, height, C.wood, 24);
  await stroke(board, '#E6A55C', 3);
  await text(parentId, 'Title/Text', label, x + width * 0.19, y + height * 0.18, height * 0.47, C.cream2, 'Semibold');
  return { back, board };
}

async function topHud(parentId, level = 1) {
  const pause = await creamPill(parentId, 'HUD/Pause', 14, 20, 48, 44);
  await text(parentId, 'HUD/PauseIcon', 'Ⅱ', 29, 28, 21, C.woodDark, 'Semibold');
  await woodTitle(parentId, `第${level}关`, 118, 16, 139, 55);
  const fish = await creamPill(parentId, 'HUD/Fish', 285, 20, 77, 44);
  await text(parentId, 'HUD/FishIcon', '🐟', 294, 27, 19, C.ink, 'Regular');
  await text(parentId, 'HUD/FishValue', '0', 338, 28, 18, C.ink, 'Semibold');
  const meterShadow = await rect(parentId, 'HUD/PurrShadow', 46, 80, 283, 24, C.woodDark, 12);
  const meter = await rect(parentId, 'HUD/PurrTrack', 48, 78, 279, 22, C.cream2, 11);
  const fill = await rect(parentId, 'HUD/PurrFill', 51, 81, 182, 16, C.purple, 8);
  await rect(parentId, 'HUD/PurrGlow', 53, 83, 176, 5, '#FFFFFF77', 3);
  await text(parentId, 'HUD/PurrIcon', '🐾', 25, 78, 19, C.purple, 'Regular');
  return { pause, fish, meterShadow, meter, fill };
}

async function createHome(sectionId, x, y) {
  const screen = await frame(sectionId, 'MMHW/V2/P01 首页', x, y, 375, 667, C.sky);
  await image(screen, 'Background/Home Garden', 'assets/game/art/home_background.jpg', 0, 0, 375, 667);
  const fish = await creamPill(screen, 'Currency/Fish', 14, 18, 92, 44);
  await text(screen, 'Currency/FishIcon', '🐟', 25, 25, 20, C.ink, 'Regular');
  await text(screen, 'Currency/Value', '128', 66, 27, 17, C.ink);
  const settings = await creamPill(screen, 'IconButton/Settings', 317, 18, 44, 44);
  await text(screen, 'IconButton/SettingsIcon', '⚙', 326, 24, 22, C.woodDark, 'Regular');
  await woodTitle(screen, '喵喵回窝', 69, 78, 237, 76);
  const cats = [
    ['calico', 85, 294, 92], ['black', 208, 286, 93], ['ragdoll', 49, 342, 96],
    ['blue', 230, 342, 98], ['orange', 137, 327, 108],
  ];
  for (const [type, cx, cy, size] of cats) await cat(screen, `Hero/${type}`, type, cx, cy, size);
  await glossyButton(screen, 'Button/Primary/Continue', '继续第1关', 55, 480, 265, C.coral, C.coralDark, 64);
  const labels = [['🗺','关卡'],['🐾','图鉴'],['⌂','外观']];
  for (let i = 0; i < labels.length; i++) {
    const px = 18 + i * 119;
    await creamPill(screen, `Nav/${labels[i][1]}`, px, 572, 101, 56);
    await text(screen, `Nav/${labels[i][1]}/Icon`, labels[i][0], px + 12, 584, 19, C.woodDark, 'Regular');
    await text(screen, `Nav/${labels[i][1]}/Label`, labels[i][1], px + 47, 586, 16, C.ink);
  }
  await text(screen, 'SafeArea/Caption', '适龄提示 8+', 157, 644, 10, '#FFFFFFDD', 'Regular');
  return screen;
}

async function createGameplay(sectionId, x, y) {
  const screen = await frame(sectionId, 'MMHW/V2/P04 第一关游戏', x, y, 375, 667, C.sky);
  await image(screen, 'Background/Gameplay Track', 'assets/game/art/gameplay_background.jpg', 0, 0, 375, 667);
  await topHud(screen, 1);
  const cats = [
    ['orange',53,190],['ragdoll',86,180],['blue',120,180],['calico',153,190],['black',181,210],
    ['orange',203,241],['blue',218,276],['ragdoll',215,311],['calico',196,341],['black',165,357],
    ['orange',131,363],['ragdoll',99,351],['blue',75,327],['calico',62,296],['black',67,262],
  ];
  for (let i = 0; i < cats.length; i++) {
    const [type, cx, cy] = cats[i];
    await cat(screen, `Chain/Cat-${String(i + 1).padStart(2,'0')}/${type}`, type, cx, cy, 42);
  }
  await cat(screen, 'Launcher/Current/orange', 'orange', 139, 491, 96);
  await ellipse(screen, 'Launcher/NextBubble', 274, 513, 52, 52, '#FFFFFFCC');
  await cat(screen, 'Launcher/Next/blue', 'blue', 279, 518, 42);
  await text(screen, 'Launcher/NextLabel', '下一只', 277, 499, 10, C.muted, 'Regular');
  await text(screen, 'Tutorial/Hint', '松手，把猫猫送去贴贴', 109, 456, 13, C.ink);
  const boosters = [['✦','逗猫棒',C.purple],['♧','猫薄荷',C.mint],['🌈','彩虹猫',C.coral]];
  for (let i = 0; i < boosters.length; i++) {
    const bx = 22 + i * 119;
    const body = await rect(screen, `Booster/${boosters[i][1]}`, bx, 588, 94, 62, boosters[i][2], 20);
    await stroke(body, '#FFF0C7', 2);
    await shadow(body, 0.24, 5, 7);
    await text(screen, `Booster/${boosters[i][1]}/Icon`, boosters[i][0], bx + 12, 599, 22, C.white, 'Regular');
    await text(screen, `Booster/${boosters[i][1]}/Count`, '3', bx + 69, 607, 16, C.white);
  }
  return screen;
}

async function resultPanel(parentId, victory) {
  const veil = await rect(parentId, 'Overlay/Dim', 0, 0, 375, 667, victory ? '#214B3344' : '#21182F77', 0);
  const panelShadow = await rect(parentId, 'Dialog/Shadow', 31, 151, 313, 428, C.woodDark, 30);
  const panel = await rect(parentId, 'Dialog/Panel', 31, 143, 313, 428, C.cream2, 30);
  await stroke(panel, '#D69650', 4);
  await cat(parentId, victory ? 'Hero/HappyOrange' : 'Hero/WorriedBlue', victory ? 'orange' : 'blue', 142, 92, 92);
  await woodTitle(parentId, victory ? '全员回窝！' : '罐头仓库挤满啦', victory ? 68 : 46, 186, victory ? 239 : 283, 62);
  if (victory) {
    for (let i = 0; i < 3; i++) {
      const star = await ellipse(parentId, `Stars/${i + 1}`, 91 + i * 68, 273, 55, 55, C.gold);
      await stroke(star, '#ED9B2E', 3);
      await text(parentId, `Stars/${i + 1}/Glyph`, '★', 101 + i * 68, 281, 31, C.white);
    }
    await text(parentId, 'Result/ScoreLabel', '本关得分', 151, 351, 13, C.muted, 'Regular');
    await text(parentId, 'Result/Score', '12,680', 119, 371, 32, C.ink);
    await text(parentId, 'Result/Reward', '🐟  +52   ·   最大连击 ×9', 95, 421, 15, C.wood);
    await glossyButton(parentId, 'Button/Primary/Next', '下一关', 72, 470, 231, C.coral, C.coralDark, 58);
    await glossyButton(parentId, 'Button/Secondary/Replay', '再玩一次', 104, 540, 167, C.mint, C.mintDark, 44);
  } else {
    await text(parentId, 'Result/Remaining', '还差 7 只猫猫', 98, 286, 26, C.ink);
    await text(parentId, 'Result/Hint', '免费帮一次，猫猫队伍后退', 85, 334, 14, C.muted, 'Regular');
    await glossyButton(parentId, 'Button/Primary/Revive', '免费帮一次', 72, 390, 231, C.purple, '#644A91', 58);
    await glossyButton(parentId, 'Button/Secondary/Retry', '重新开始', 104, 462, 167, C.mint, C.mintDark, 46);
    await text(parentId, 'Button/Tertiary/Map', '返回地图', 157, 530, 13, C.muted, 'Regular');
  }
  return { veil, panelShadow, panel };
}

async function createResult(sectionId, x, y, victory) {
  const screen = await frame(sectionId, victory ? 'MMHW/V2/P06 胜利结算' : 'MMHW/V2/P07 失败复活', x, y, 375, 667, C.sky);
  await image(screen, 'Background/Garden', 'assets/game/art/home_background.jpg', 0, 0, 375, 667);
  await resultPanel(screen, victory);
  return screen;
}

async function createSecondary(sectionId, name, x, y, kind) {
  const screen = await frame(sectionId, `MMHW/V2/${name}`, x, y, 375, 667, C.sky);
  await image(screen, 'Background/Garden', 'assets/game/art/home_background.jpg', 0, 0, 375, 667);
  const veil = await rect(screen, 'Background/SoftVeil', 0, 0, 375, 667, '#FFF8EAAA', 0);
  if (kind === 'loading') {
    await woodTitle(screen, '喵喵回窝', 69, 123, 237, 78);
    const types = ['orange','ragdoll','blue','calico','black'];
    for (let i = 0; i < types.length; i++) await cat(screen, `Loading/${types[i]}`, types[i], 45 + i * 57, 279, 60);
    await rect(screen, 'Loading/Track', 47, 455, 281, 24, '#FFFFFF', 12);
    await rect(screen, 'Loading/Fill', 51, 459, 196, 16, C.orange, 8);
    await text(screen, 'Loading/Text', '猫猫正在集合… 70%', 116, 495, 15, C.ink);
  } else if (kind === 'map') {
    await woodTitle(screen, '猫猫小路', 87, 35, 201, 62);
    for (let i = 0; i < 12; i++) {
      const row = Math.floor(i / 3), col = i % 3, px = 52 + col * 105, py = 141 + row * 104;
      const node = await ellipse(screen, `Level/${i+1}`, px, py, 62, 62, i < 4 ? C.coral : C.disabled);
      await stroke(node, C.cream2, 4);
      await text(screen, `Level/${i+1}/Label`, i < 4 ? `${i+1}` : '🔒', px + 21, py + 18, 18, C.white, 'Semibold');
    }
    await glossyButton(screen, 'Button/Primary/Continue', '挑战第4关', 79, 575, 217, C.coral, C.coralDark, 52);
  } else if (kind === 'prepare') {
    await woodTitle(screen, '第1关 · 五猫迎宾', 47, 45, 281, 62);
    await cat(screen, 'Preview/Orange', 'orange', 132, 142, 112);
    await text(screen, 'Goal/Title', '让全部猫猫回窝', 103, 281, 23, C.ink);
    await text(screen, 'Goal/Subtitle', '五种猫猫都会登场', 116, 320, 14, C.muted, 'Regular');
    for (let i = 0; i < 3; i++) {
      await creamPill(screen, `Booster/Slot-${i+1}`, 39 + i * 104, 383, 89, 70);
      await text(screen, `Booster/Slot-${i+1}/Icon`, ['✦','♧','🌈'][i], 67 + i * 104, 396, 26, [C.purple,C.mint,C.coral][i], 'Regular');
    }
    await glossyButton(screen, 'Button/Primary/Start', '开始送猫猫回窝', 55, 529, 265, C.coral, C.coralDark, 62);
  } else if (kind === 'collection') {
    await woodTitle(screen, '猫猫图鉴', 87, 35, 201, 62);
    const types = ['orange','ragdoll','blue','calico','black','orange','ragdoll','blue','calico','black','orange','ragdoll'];
    for (let i = 0; i < 12; i++) {
      const row = Math.floor(i / 3), col = i % 3, px = 25 + col * 116, py = 123 + row * 119;
      const card = await rect(screen, `Card/${i+1}`, px, py, 96, 102, i < 5 ? C.cream2 : '#B9AEAF', 18);
      await shadow(card, 0.12, 4, 6);
      if (i < 5) await cat(screen, `Card/${i+1}/Cat`, types[i], px + 13, py + 8, 70);
      else await text(screen, `Card/${i+1}/Lock`, '🔒', px + 34, py + 26, 23, C.white, 'Regular');
      await text(screen, `Card/${i+1}/Label`, i < 5 ? ['橘团','雪团','蓝莓','花卷','煤球'][i] : `${(i+1)*3}星`, px + 29, py + 80, 12, i < 5 ? C.ink : C.white, 'Regular');
    }
  } else if (kind === 'cosmetic') {
    await woodTitle(screen, '猫窝外观', 87, 35, 201, 62);
    await cat(screen, 'Preview/Cat', 'orange', 135, 129, 106);
    await text(screen, 'Tabs', '猫窝     拖尾', 119, 258, 16, C.ink);
    for (let i = 0; i < 6; i++) {
      const col=i%3,row=Math.floor(i/3),px=27+col*115,py=310+row*137;
      const card=await rect(screen,`Cosmetic/${i+1}`,px,py,91,116,i===0?C.gold:C.cream2,18);
      await shadow(card,0.13,4,6);
      await text(screen,`Cosmetic/${i+1}/Icon`,'⌂',px+29,py+17,32,i===0?C.white:C.wood,'Regular');
      await text(screen,`Cosmetic/${i+1}/State`,i===0?'使用中':`🐟 ${150+i*50}`,px+18,py+82,12,i===0?C.white:C.ink,'Regular');
    }
  } else if (kind === 'settings') {
    await woodTitle(screen, '设置', 118, 50, 139, 62);
    const rows=[['音乐','开'],['音效','开'],['震动','开']];
    for(let i=0;i<rows.length;i++){
      await creamPill(screen,`Setting/${rows[i][0]}`,38,167+i*92,299,65);
      await text(screen,`Setting/${rows[i][0]}/Label`,rows[i][0],66,187+i*92,18,C.ink);
      const toggle=await rect(screen,`Setting/${rows[i][0]}/Toggle`,259,183+i*92,57,33,C.mint,17);
      await ellipse(screen,`Setting/${rows[i][0]}/Knob`,286,186+i*92,27,27,C.white);
    }
    await text(screen,'Links','隐私政策  ·  适龄提示  ·  用户协议',77,489,13,C.muted,'Regular');
    await glossyButton(screen,'Button/Primary/Back','保存并返回',91,552,193,C.coral,C.coralDark,52);
  }
  return screen;
}

async function buildComponents(sectionId, x, y) {
  const board = await frame(sectionId, 'MMHW/V2/02_Components', x, y, 1010, 800, '#F5EADB');
  await text(board, 'Heading', '02 · 可复用组件与状态', 34, 28, 28, C.ink);
  await text(board, 'Caption', '主按钮、货币、呼噜槽、猫咪徽章均为独立可编辑层；按下/禁用状态列在右侧。', 34, 68, 14, C.muted, 'Regular');

  const primaryFrame = await frame(board, 'Button/Primary/Normal', 34, 120, 260, 70, '#00000000');
  await glossyButton(primaryFrame, 'Layers', '继续第1关', 0, 0, 260, C.coral, C.coralDark, 60);
  await call('create_component', { nodeId: primaryFrame, name: 'MMHW/Button/Primary/Normal' });
  const pressedFrame = await frame(board, 'Button/Primary/Pressed', 320, 126, 260, 64, '#00000000');
  await glossyButton(pressedFrame, 'Layers', '继续第1关', 0, 2, 260, '#F26054', '#C5473D', 56);
  await call('create_component', { nodeId: pressedFrame, name: 'MMHW/Button/Primary/Pressed' });
  const disabledFrame = await frame(board, 'Button/Primary/Disabled', 606, 120, 260, 70, '#00000000');
  await glossyButton(disabledFrame, 'Layers', '暂不可用', 0, 0, 260, C.disabled, '#A99F97', 60);
  await call('create_component', { nodeId: disabledFrame, name: 'MMHW/Button/Primary/Disabled' });

  const currencyFrame = await frame(board, 'CurrencyPill/Fish', 34, 242, 128, 58, '#00000000');
  await creamPill(currencyFrame, 'Layers', 0, 0, 128, 50);
  await text(currencyFrame, 'Icon', '🐟', 12, 10, 21, C.ink, 'Regular');
  await text(currencyFrame, 'Value', '1,280', 57, 13, 17, C.ink);
  await call('create_component', { nodeId: currencyFrame, name: 'MMHW/CurrencyPill/Fish' });

  const meterFrame = await frame(board, 'Progress/Purr/Normal', 204, 242, 334, 58, '#00000000');
  await rect(meterFrame, 'Track', 31, 12, 292, 26, C.cream2, 13);
  await rect(meterFrame, 'Fill', 35, 16, 194, 18, C.purple, 9);
  await rect(meterFrame, 'Gloss', 39, 19, 185, 5, '#FFFFFF77', 3);
  await text(meterFrame, 'Icon', '🐾', 0, 11, 20, C.purple, 'Regular');
  await call('create_component', { nodeId: meterFrame, name: 'MMHW/Progress/Purr/Normal' });

  const types = ['orange','ragdoll','blue','calico','black'];
  for (let i=0;i<types.length;i++) {
    const badge = await frame(board, `CatBadge/${types[i]}`, 34+i*148, 370, 124, 154, C.cream2);
    await call('set_corner_radius', { nodeIds:[badge], cornerRadius:22 });
    await cat(badge, 'Sprite', types[i], 13, 11, 98);
    await text(badge, 'Label', ['橘猫','布偶','蓝猫','三花','玄猫'][i], 41, 118, 15, C.ink);
    await call('create_component', { nodeId: badge, name: `MMHW/CatBadge/${types[i]}` });
  }
  await text(board, 'MotionTitle', '动效节奏', 34, 576, 19, C.ink);
  await text(board, 'MotionBody', '按钮 80ms 压下 / 140ms 回弹   ·   贴贴 120ms 蓄力 / 420ms 回窝\n呼噜暴走 300ms 蓄势 / 650ms 批量飞行   ·   触控热区不小于 44pt', 34, 611, 15, C.muted, 'Regular');
  return board;
}

async function buildFoundations(sectionId, x, y) {
  const board = await frame(sectionId, 'MMHW/V2/01_Foundations', x, y, 760, 800, '#FFF9EC');
  await text(board, 'Heading', '01 · 视觉基础', 34, 28, 28, C.ink);
  await text(board, 'Direction', '软糖猫咪 × 奶油木作 × 晴日庭院', 34, 72, 17, C.wood, 'Regular');
  const swatches = Object.entries({Sky:C.sky,Cream:C.cream,Grass:C.grass,Ink:C.ink,Orange:C.orange,Coral:C.coral,Mint:C.mint,Blue:C.blue,Purple:C.purple,Gold:C.gold});
  for(let i=0;i<swatches.length;i++){
    const col=i%5,row=Math.floor(i/5),px=34+col*136,py=133+row*111;
    const sw=await rect(board,`Token/${swatches[i][0]}`,px,py,112,66,swatches[i][1],16);
    await stroke(sw,'#FFFFFF',3);
    await text(board,`Token/${swatches[i][0]}/Name`,swatches[i][0],px,py+76,12,C.ink,'Regular');
  }
  await text(board, 'TypeTitle', '字阶 / PingFang SC', 34, 386, 19, C.ink);
  await text(board, 'Type/H1', '喵喵回窝', 34, 426, 38, C.ink);
  await text(board, 'Type/H2', '全员回窝！', 36, 488, 26, C.ink);
  await text(board, 'Type/Body', '让相同猫猫连成三只，开心贴贴回窝。', 36, 536, 16, C.muted, 'Regular');
  await text(board, 'Spacing', '间距：8 / 16 / 24 / 32 / 48    圆角：16 / 24 / 32 / 全圆', 36, 603, 14, C.muted, 'Regular');
  await text(board, 'Rules', '背景负责氛围，猫咪负责焦点，木牌负责信息，珊瑚色只用于主行动。', 36, 657, 15, C.wood, 'Regular');
  return board;
}

async function createReferenceBoard(sectionId) {
  const board = await frame(sectionId, 'MMHW/V2/00_ImageGen_Final_Masters', 80, 170, 3800, 980, '#F5EADB');
  await text(board, 'Heading', '00 · ImageGen 最终视觉母版（后续 Figma 与 Cocos 的唯一视觉基准）', 34, 26, 27, C.ink);
  await image(board, 'Master/Home', 'art/final/home_master.png', 34, 86, 385, 684, 'FIT');
  await image(board, 'Master/Gameplay', 'art/final/gameplay_master.png', 451, 86, 385, 684, 'FIT');
  await image(board, 'Master/Results', 'art/final/result_master.png', 869, 86, 1080, 608, 'FIT');
  await image(board, 'Master/Cats', 'assets/game/art/cats/cat_atlas.png', 1982, 116, 1080, 216, 'FIT');
  await image(board, 'Plate/Home', 'art/final/home_background.png', 3094, 86, 320, 569, 'FIT');
  await image(board, 'Plate/Gameplay', 'art/final/gameplay_background.png', 3446, 86, 320, 569, 'FIT');
  await text(board, 'Note', '真实开发资产：场景底图无猫无 UI；五只猫为透明独立 PNG；交互、文字、按钮全部在 Figma/Cocos 中保持可编辑。', 1984, 383, 15, C.ink, 'Regular');
  await text(board, 'QualityGate', '禁止：整屏截图覆盖透明点击区  ·  禁止：程序圆形代替猫  ·  禁止：默认控件进入发布包', 1984, 434, 16, C.coralDark);
  return board;
}

async function createHandoff(sectionId, x, y) {
  const board=await frame(sectionId,'MMHW/V2/08_Dev_Handoff',x,y,1040,800,'#FFF9EC');
  await text(board,'Heading','08 · 开发交付标注',34,28,28,C.ink);
  await text(board,'Spec','设计稿 375×667；Cocos 逻辑分辨率 750×1334，坐标与尺寸 ×2。\n背景：等比 COVER；顶部安全区 44pt；底部安全区 34pt；抖音胶囊右上动态避让。',34,77,15,C.muted,'Regular');
  await text(board,'LayersTitle','运行时图层',34,163,19,C.ink);
  const rows=[['100','顶层弹窗 / Toast'],['80','HUD / 道具 / 发射器'],['60','回窝粒子 / 飘字'],['40','动态猫咪 / 弹射物'],['20','场景底图 / 轨道']];
  for(let i=0;i<rows.length;i++){
    await creamPill(board,`Layer/${rows[i][0]}`,34,205+i*61,486,46);
    await text(board,`Layer/${rows[i][0]}/Z`,rows[i][0],52,217+i*61,14,C.coral);
    await text(board,`Layer/${rows[i][0]}/Name`,rows[i][1],109,217+i*61,14,C.ink,'Regular');
  }
  await text(board,'AssetsTitle','正式资源',566,163,19,C.ink);
  await text(board,'Assets','home_background.jpg\ngameplay_background.jpg\ncat_{orange|ragdoll|blue|calico|black}.png\nUI 形状与文字按本页令牌在 Cocos 复刻。',566,205,15,C.muted,'Regular');
  await text(board,'AcceptanceTitle','画面验收',566,378,19,C.ink);
  await text(board,'Acceptance','✓ 3 秒内看见猫、轨道、目标\n✓ 64px 五猫仍可分辨\n✓ 主按钮不与次入口同权重\n✓ 无 FPS 面板与调试字\n✓ 胜负弹窗不遮挡关键状态\n✓ 375×667 / 390×844 / 430×932 无遮挡',566,420,15,C.muted,'Regular');
  return board;
}

async function createTokens() {
  const collection = await call('create_variable_collection', { name: 'MMHW V2 / Release', initialModeName: 'Default' });
  const collectionId = collection.id ?? collection.collectionId;
  const variables = [
    ['color/sky','COLOR',C.sky],['color/cream','COLOR',C.cream],['color/grass','COLOR',C.grass],
    ['color/ink','COLOR',C.ink],['color/orange','COLOR',C.orange],['color/coral','COLOR',C.coral],
    ['color/mint','COLOR',C.mint],['color/blue','COLOR',C.blue],['color/purple','COLOR',C.purple],
    ['color/gold','COLOR',C.gold],['radius/card','FLOAT','24'],['radius/button','FLOAT','32'],
    ['space/base','FLOAT','8'],['space/section','FLOAT','32'],
  ];
  for (const [name,type,value] of variables) await call('create_variable',{collectionId,name,type,value});
  await call('create_text_style',{name:'MMHW V2 / Display',fontFamily:'PingFang SC',fontStyle:'Semibold',fontSize:38,lineHeightUnit:'PIXELS',lineHeightValue:48,description:'页面大标题'});
  await call('create_text_style',{name:'MMHW V2 / Body',fontFamily:'PingFang SC',fontStyle:'Regular',fontSize:16,lineHeightUnit:'PIXELS',lineHeightValue:24,description:'正文'});
  await call('create_effect_style',{name:'MMHW V2 / Tactile Shadow',type:'DROP_SHADOW',color:C.woodDark,opacity:0.22,offsetX:0,offsetY:6,radius:10,spread:0,description:'木作与按钮统一阴影'});
}

async function main() {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'codex-miaomiaozuma-v2',version:'2.0.0'}});
  child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized',params:{}})}\n`);
  const metadata=await call('get_metadata');
  if(metadata.currentPageId!=='11:7101') throw new Error(`Wrong Figma page: ${metadata.currentPageId} ${metadata.currentPageName}`);

  const old=await call('get_node',{nodeId:'358:304'});
  if(old?.id) await call('rename_node',{nodeId:'358:304',name:'喵喵回窝 / 99_Archive_Old_MVP（禁止开发使用）'});

  const existing=await call('search_nodes',{query:'喵喵回窝 / Release V2',nodeId:'11:7101',limit:5});
  if((existing.nodes??[]).length) throw new Error('Release V2 section already exists; refusing duplicate.');

  await createTokens();
  const sectionId=idOf(await call('create_section',{name:'喵喵回窝 / Release V2',x:29650,y:0,width:7100,height:4300}));
  await text(sectionId,'MMHW/V2/SectionTitle','喵喵回窝 · Release V2 高保真设计交付',80,52,42,C.ink);
  await text(sectionId,'MMHW/V2/SectionMeta','ImageGen 最终母版 → Figma 可编辑还原 → Cocos 正式资源实现 · 旧版已归档，禁止继续开发使用',82,112,17,C.coralDark,'Regular');
  await createReferenceBoard(sectionId);
  await buildFoundations(sectionId,80,1230);
  await buildComponents(sectionId,880,1230);
  await createHandoff(sectionId,1930,1230);

  await text(sectionId,'MMHW/V2/CoreScreensTitle','04 · 核心页面（高保真可编辑还原）',80,2090,28,C.ink);
  const core=[
    await createHome(sectionId,80,2150),
    await createGameplay(sectionId,495,2150),
    await createResult(sectionId,910,2150,true),
    await createResult(sectionId,1325,2150,false),
  ];

  await text(sectionId,'MMHW/V2/SecondaryScreensTitle','05 · 上线必需页面',80,2880,28,C.ink);
  const secondary=[
    await createSecondary(sectionId,'P00 启动加载',80,2940,'loading'),
    await createSecondary(sectionId,'P02 关卡地图',495,2940,'map'),
    await createSecondary(sectionId,'P03 开局准备',910,2940,'prepare'),
    await createSecondary(sectionId,'P08 猫咪图鉴',1325,2940,'collection'),
    await createSecondary(sectionId,'P09 外观选择',1740,2940,'cosmetic'),
    await createSecondary(sectionId,'P10 设置',2155,2940,'settings'),
  ];

  await call('save_screenshots',{items:[
    {nodeId:sectionId,outputPath:'art/qa/figma-release-v2.png',format:'PNG',scale:0.5},
    {nodeId:core[0],outputPath:'art/qa/figma-v2-home.png',format:'PNG',scale:2},
    {nodeId:core[1],outputPath:'art/qa/figma-v2-gameplay.png',format:'PNG',scale:2},
    {nodeId:core[2],outputPath:'art/qa/figma-v2-win.png',format:'PNG',scale:2},
    {nodeId:core[3],outputPath:'art/qa/figma-v2-fail.png',format:'PNG',scale:2},
  ]});
  console.log(JSON.stringify({sectionId,core,secondary}));
}

main().then(()=>child.kill('SIGTERM')).catch((error)=>{console.error(error);child.kill('SIGTERM');process.exitCode=1;});
