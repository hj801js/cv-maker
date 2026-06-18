// Shipped-artifact smoke test. Launches the packaged binary in
// release/win-unpacked, pointed at a throwaway data dir (never touches real CV
// data), and checks the real runtime: seed load, render, language toggle, PDF.
//
//   npm run pack    # build release/win-unpacked first
//   npm run smoke
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Default to the unpacked binary; pass a path to verify a built installer's exe,
// e.g.  npm run smoke -- "release/CV Maker 0.1.0.exe"  (portable).
const exe = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'release', 'win-unpacked', 'CV Maker.exe');

if (!existsSync(exe)) {
  console.error(`✗ packaged binary not found: ${exe}\n  Build it first:  npm run pack`);
  process.exit(2);
}

// Isolate everything in a temp dir so the real Documents\CV_maker is untouched.
const tmp = mkdtempSync(path.join(os.tmpdir(), 'cvmaker-smoke-'));
const userData = path.join(tmp, 'userData');
const dataDir = path.join(tmp, 'data');
const reportPath = path.join(tmp, 'report.json');
const pdfPath = path.join(tmp, 'smoke.pdf');
mkdirSync(userData, { recursive: true });
writeFileSync(path.join(userData, 'config.json'), JSON.stringify({ dataDir }), 'utf-8');

console.log(`• binary   : ${exe}`);
console.log(`• data dir : ${dataDir}  (throwaway)`);

const child = spawn(exe, [`--user-data-dir=${userData}`], {
  env: {
    ...process.env,
    CVMAKER_SMOKE: '1',
    CVMAKER_SMOKE_REPORT: reportPath,
    CVMAKER_SMOKE_PDF: pdfPath
  },
  stdio: 'ignore'
});

const deadline = Date.now() + 45000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let exited = null;
child.on('exit', (code) => { exited = code; });

function finish(passed) {
  try { if (!child.killed && exited === null) child.kill(); } catch {}
  if (passed) {
    try { rmSync(tmp, { recursive: true, force: true }); } catch {}
    console.log('\n✓ SMOKE PASSED — shipped artifact verified');
    process.exit(0);
  } else {
    console.error(`\n✗ SMOKE FAILED — artifacts kept for inspection: ${tmp}`);
    process.exit(1);
  }
}

// Wait for the in-process self-test to drop its report. A portable/SFX launcher
// can exit right after spawning the inner app, so allow a grace window for the
// detached process to finish writing the report before calling it a failure.
let graceUntil = null;
while (Date.now() < deadline && !existsSync(reportPath)) {
  if (exited !== null) {
    if (graceUntil === null) graceUntil = Date.now() + 12000;
    else if (Date.now() > graceUntil) {
      console.error(`✗ app exited (code ${exited}) without writing a report`);
      finish(false);
    }
  }
  await sleep(250);
}

if (!existsSync(reportPath)) {
  console.error('✗ timed out waiting for the smoke report');
  finish(false);
}

const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
console.log('\n— in-app probes —');
for (const s of report.steps) {
  console.log(`  ${s.ok ? '✓' : '✗'} ${s.name}${s.detail ? '  ' + JSON.stringify(s.detail) : ''}`);
}

// Independent (out-of-app) evidence checks.
console.log('\n— external evidence —');
let extOk = true;

const seededKR = existsSync(path.join(dataDir, '기본_KR.json'));
const seededEN = existsSync(path.join(dataDir, '기본_EN.json'));
console.log(`  ${seededKR && seededEN ? '✓' : '✗'} seed materialized profile files (기본_KR.json, 기본_EN.json)`);
extOk = extOk && seededKR && seededEN;

let pdfOk = false;
if (existsSync(pdfPath)) {
  const head = readFileSync(pdfPath).subarray(0, 5).toString('latin1');
  const size = readFileSync(pdfPath).length;
  pdfOk = head === '%PDF-' && size > 1000;
  console.log(`  ${pdfOk ? '✓' : '✗'} exported PDF on disk (${size} bytes, magic "${head}")`);
} else {
  console.log('  ✗ exported PDF file missing');
}
extOk = extOk && pdfOk;

finish(report.ok === true && extOk);
