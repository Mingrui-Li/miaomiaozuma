#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const required = [
  'assets/game/scenes/main.scene',
  'assets/game/scripts/app/GameRoot.ts',
  'assets/game/scripts/core/GameSession.ts',
  'assets/game/configs/Levels.ts',
  'docs/PRODUCT_SPEC.md',
  'docs/FIGMA_HANDOFF.md',
  'art/qa/figma-mvp-section-v2.png',
];
for (const path of required) {
  if (!existsSync(path)) throw new Error(`Missing required deliverable: ${path}`);
}
const scene = JSON.parse(readFileSync('assets/game/scenes/main.scene', 'utf8'));
if (!Array.isArray(scene) || scene[0]?.__type__ !== 'cc.SceneAsset') throw new Error('main.scene is not a Cocos scene asset');
const levelsText = readFileSync('assets/game/configs/Levels.ts', 'utf8');
if (!levelsText.includes("[24,'全员回窝'")) throw new Error('Level 24 is missing');
console.log(`Project QA passed: ${required.length} required deliverables and the Cocos scene structure are present.`);

