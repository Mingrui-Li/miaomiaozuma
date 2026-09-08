#!/usr/bin/env node

import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const tsc = '/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript/bin/tsc';
rmSync('.test-dist', { recursive: true, force: true });
const compile = spawnSync(tsc, ['-p', 'tsconfig.core.json'], { stdio: 'inherit' });
if (compile.status !== 0) process.exit(compile.status ?? 1);

const require = createRequire(import.meta.url);
const { runAll } = require('../.test-dist/assets/game/tests/CoreTests.js');
const result = runAll();
console.log(`Core QA passed: ${result.assertions} focused assertions + ${result.simulations} deterministic simulations.`);

