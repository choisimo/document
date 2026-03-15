// run-mcp.js
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Allow custom config path via first CLI argument, else default to sibling mcp_config.json
const configPath = process.argv[2] ?? path.join(__dirname, 'mcp_config.json');

let cfg;
try {
  cfg = JSON.parse(await fs.readFile(configPath, 'utf8'));
} catch (err) {
  console.error(`Failed to read config at ${configPath}:`, err.message);
  process.exit(1);
}

//
// 1. 서버 기동
//
for (const [name, s] of Object.entries(cfg.mcp.servers)) {
  console.log(`▶️  starting server: ${name}`);
  const child = spawn(s.command, s.args, {
    stdio: 'inherit',
    env: { ...process.env, ...s.env }
  });
  child.on('exit', code => console.log(`⛔️  ${name} exited (${code})`));
}

//
// 2. VS Code 확장 설치
//
for (const [_cat, exts] of Object.entries(cfg.mcp.recommended_extensions)) {
  for (const ext of exts) {
    if (!ext.command) continue;          // 내장 기능이면 skip
    console.log(`🔧 installing: ${ext.name}`);
    spawn(ext.command, ext.args, { stdio: 'inherit' });
  }
}
