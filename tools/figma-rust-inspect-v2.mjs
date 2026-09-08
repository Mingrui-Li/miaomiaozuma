#!/usr/bin/env node

import { spawn } from 'node:child_process';
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

async function call(name, args = {}) {
  return parse(await rpc('tools/call', { name, arguments: args }));
}

async function main() {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'codex-miaomiaozuma-v2-inspector', version: '1.0.0' } });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);

  const metadata = await call('get_metadata');
  const sectionSearch = await call('search_nodes', { query: 'Release V2', nodeId: metadata.currentPageId, limit: 20 });
  const candidates = sectionSearch.nodes ?? sectionSearch.results ?? [];
  const section = candidates.find((node) => String(node.name ?? '').includes('喵喵回窝')) ?? candidates[0];
  if (!section) throw new Error('Release V2 section not found.');

  const [sectionInfo, frames, components, textNodes, fonts] = await Promise.all([
    call('get_node', { nodeId: section.id }),
    call('scan_nodes_by_types', { nodeId: section.id, types: ['FRAME', 'SECTION'] }),
    call('scan_nodes_by_types', { nodeId: section.id, types: ['COMPONENT', 'COMPONENT_SET', 'INSTANCE'] }),
    call('scan_text_nodes', { nodeId: section.id }),
    call('get_fonts'),
  ]);

  await call('save_screenshots', {
    items: [{ nodeId: section.id, outputPath: 'art/qa/figma-v2-before-rebuild.png', format: 'PNG', scale: 0.35 }],
  });

  console.log(JSON.stringify({ metadata, section: sectionInfo, frameCount: (frames.nodes ?? frames.results ?? []).length, frames, components, textCount: (textNodes.nodes ?? textNodes.results ?? []).length, fonts }, null, 2));
}

main()
  .then(() => child.kill('SIGTERM'))
  .catch((error) => { console.error(error); child.kill('SIGTERM'); process.exitCode = 1; });
