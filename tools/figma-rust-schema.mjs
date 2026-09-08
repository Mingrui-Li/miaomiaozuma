#!/usr/bin/env node
import { spawn } from 'node:child_process';
import readline from 'node:readline';

const binary = '/Users/limingrui/.codex/tools/figma-mcp-rust/0.2.0/node_modules/@alvinindra/figma-mcp-rust/bin/darwin-x64/figma-mcp-rust';
const child = spawn(binary, ['--ip', '127.0.0.1', '--port', '1994'], { stdio: ['pipe', 'pipe', 'inherit'] });
const lines = readline.createInterface({ input: child.stdout });
const pending = new Map();
let id = 1;
lines.on('line', (line) => {
  try {
    const message = JSON.parse(line);
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  } catch {}
});
function rpc(method, params = {}) {
  const requestId = id++;
  const result = new Promise((resolve) => pending.set(requestId, resolve));
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params })}\n`);
  return result;
}
await new Promise((resolve) => setTimeout(resolve, 8000));
await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'schema-inspector', version: '1.0' } });
child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
const response = await rpc('tools/list');
if (process.argv.includes('--names')) {
  console.log(response.result.tools.map((tool) => tool.name).sort().join('\n'));
  child.kill('SIGTERM');
  process.exit(0);
}
const wanted = new Set([
  'get_fonts', 'scan_text_nodes', 'scan_nodes_by_types', 'get_nodes_info', 'get_reactions',
  'create_vector', 'create_component', 'create_component_instance', 'set_reactions',
  'create_frame', 'create_rectangle', 'create_ellipse', 'create_text', 'create_section',
  'import_image', 'delete_node', 'delete_nodes', 'resize_node', 'resize_nodes', 'move_nodes',
  'rotate_nodes', 'group_nodes', 'set_fills', 'set_corner_radius',
  'set_strokes', 'set_effects', 'set_opacity', 'set_visible', 'rename_node',
  'clone_node', 'set_text', 'reparent_nodes', 'reorder_nodes', 'lock_nodes',
]);
console.log(JSON.stringify(response.result.tools.filter((tool) => wanted.has(tool.name)), null, 2));
child.kill('SIGTERM');
