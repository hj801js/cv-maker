// Capture README screenshots from the packaged app against the sample data.
//   npm run pack && npm run screenshots   ->   docs/editor.png, docs/preview.png
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exe = path.join(root, 'release', 'win-unpacked', 'CV Maker.exe');
if (!existsSync(exe)) {
  console.error(`✗ packaged binary not found: ${exe}\n  Build it first:  npm run pack`);
  process.exit(2);
}

const outDir = path.join(root, 'docs');
mkdirSync(outDir, { recursive: true });

// Throwaway data dir so the real Documents\CV_maker is untouched (the app seeds
// the anonymized sample on first run).
const tmp = mkdtempSync(path.join(os.tmpdir(), 'cvmaker-shot-'));
const userData = path.join(tmp, 'userData');
const dataDir = path.join(tmp, 'data');
const reportPath = path.join(tmp, 'report.json');
mkdirSync(userData, { recursive: true });
writeFileSync(path.join(userData, 'config.json'), JSON.stringify({ dataDir }), 'utf-8');

const child = spawn(exe, [`--user-data-dir=${userData}`], {
  env: {
    ...process.env,
    CVMAKER_SMOKE: '1',          // reuse the self-test flow that drives the UI
    CVMAKER_SHOT_DIR: outDir,    // ...and have it capturePage along the way
    CVMAKER_SMOKE_REPORT: reportPath
  },
  stdio: 'ignore'
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = Date.now() + 45000;
let exited = null;
child.on('exit', (c) => { exited = c; });
let grace = null;
while (Date.now() < deadline && !existsSync(reportPath)) {
  if (exited !== null) {
    if (grace === null) grace = Date.now() + 12000;
    else if (Date.now() > grace) break;
  }
  await sleep(250);
}
try { if (!child.killed && exited === null) child.kill(); } catch {}
try { rmSync(tmp, { recursive: true, force: true }); } catch {}

const editor = path.join(outDir, 'editor.png');
const preview = path.join(outDir, 'preview.png');
const ok = existsSync(editor) && existsSync(preview);
console.log(`${ok ? '✓' : '✗'} screenshots: editor.png=${existsSync(editor)} preview.png=${existsSync(preview)} (docs/)`);
process.exit(ok ? 0 : 1);
