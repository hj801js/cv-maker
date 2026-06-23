import {
  sanitizeProfileName,
  profileBaseFromFile,
  screenImportLang,
  looksLikeCv,
  normalizeOrcidId,
  normalizeCombined
} from './lib/profiles.js';

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = !!DEV_URL;

let mainWindow = null;
let dataDir = null;
let krPath = null;
let enPath = null;
let legacyPath = null; // old combined cv.json, used once for migration
let configPath = null;

function resolveSeedPath() {
  if (isDev) {
    return path.join(__dirname, '..', 'electron', 'resources', 'cv.seed.json');
  }
  return path.join(process.resourcesPath, 'resources', 'cv.seed.json');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readConfig() {
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeConfig(cfg) {
  await ensureDir(path.dirname(configPath));
  await fs.writeFile(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
}

function setDataDir(dir) {
  dataDir = dir;
  krPath = path.join(dir, 'cv_KR.json');
  enPath = path.join(dir, 'cv_EN.json');
  legacyPath = path.join(dir, 'cv.json');
}

async function initPaths() {
  configPath = path.join(app.getPath('userData'), 'config.json');
  const cfg = await readConfig();
  const defaultDir = path.join(app.getPath('documents'), 'CV_maker');
  setDataDir(cfg.dataDir || defaultDir);
  await ensureDir(dataDir);
  // First-run seeding / migration happens lazily in loadCv().
}

// ---- Profile storage (schema v4) ------------------------------------------
// In memory the renderer uses a combined shape { settings, order, hiddenSections, ko, en }.
// On disk each profile is a pair of per-language files in the data folder:
//   <profile>_KR.json / <profile>_EN.json, shaped { _meta:{schemaVersion:4, lang}, hidden, cv }.
// The active profile + language + section order live in config.json.

function fileObjFor(lang, norm) {
  return {
    _meta: { schemaVersion: 4, lang },
    hidden: (norm.hiddenSections && norm.hiddenSections[lang]) || [],
    cv: norm[lang] || {}
  };
}

async function writeJsonAtomic(file, obj) {
  await ensureDir(path.dirname(file));
  const tmp = file + '.tmp';
  const bak = file + '.bak';
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf-8');
  try {
    if (existsSync(file)) await fs.copyFile(file, bak);
  } catch (e) {
    console.warn('Backup rotation failed (non-fatal):', e.message);
  }
  await fs.rename(tmp, file);
}

async function readSide(file) {
  if (!existsSync(file)) return { hidden: [], cv: {} };
  try {
    const o = JSON.parse(await fs.readFile(file, 'utf-8'));
    return { hidden: Array.isArray(o.hidden) ? o.hidden : [], cv: o.cv || {} };
  } catch {
    return { hidden: [], cv: {} };
  }
}

function profilePath(name, lang) {
  return path.join(dataDir, `${name}_${lang === 'ko' ? 'KR' : 'EN'}.json`);
}

// Profile names = base names of <name>_KR.json / <name>_EN.json files in the data dir.
async function listProfileNames() {
  let files = [];
  try { files = await fs.readdir(dataDir); } catch { return []; }
  const set = new Set();
  for (const f of files) {
    const base = profileBaseFromFile(f);
    if (base) set.add(base);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

// Ensure at least one profile exists; otherwise build "기본" from a legacy
// combined cv.json or the bundled seed.
async function ensureProfiles() {
  const names = await listProfileNames();
  if (names.length) return names;
  let source = null;
  if (existsSync(legacyPath)) {
    try { source = JSON.parse(await fs.readFile(legacyPath, 'utf-8')); } catch {}
  }
  if (!source) {
    const seed = resolveSeedPath();
    if (existsSync(seed)) {
      try { source = JSON.parse(await fs.readFile(seed, 'utf-8')); } catch {}
    }
  }
  const norm = normalizeCombined(source || {});
  await writeJsonAtomic(profilePath('기본', 'ko'), fileObjFor('ko', norm));
  await writeJsonAtomic(profilePath('기본', 'en'), fileObjFor('en', norm));
  const cfg = await readConfig();
  cfg.activeProfile = '기본';
  if (!cfg.lang) cfg.lang = (norm.settings && norm.settings.lang) || 'en';
  cfg.dataDir = dataDir;
  await writeConfig(cfg);
  return ['기본'];
}

async function activeProfileName() {
  const names = await ensureProfiles();
  const cfg = await readConfig();
  if (cfg.activeProfile && names.includes(cfg.activeProfile)) return cfg.activeProfile;
  cfg.activeProfile = names[0];
  await writeConfig(cfg);
  return names[0];
}

async function loadCv() {
  const active = await activeProfileName();
  // One-time tidy: the combined cv.json is superseded by per-profile files.
  if (existsSync(legacyPath)) {
    try { await fs.rename(legacyPath, legacyPath + '.superseded'); } catch {}
  }
  const kr = await readSide(profilePath(active, 'ko'));
  const en = await readSide(profilePath(active, 'en'));
  const cfg = await readConfig();
  return {
    _meta: { schemaVersion: 4 },
    settings: { lang: cfg.lang || 'en' },
    order: Array.isArray(cfg.order) ? cfg.order : [],
    tableSections: Array.isArray(cfg.tableSections) ? cfg.tableSections : [], // KO-only table style
    style: (cfg.style && typeof cfg.style === 'object') ? cfg.style : {},
    hiddenSections: { ko: kr.hidden, en: en.hidden },
    ko: kr.cv,
    en: en.cv
  };
}

async function saveCv(data) {
  await ensureDir(dataDir);
  const active = await activeProfileName();
  const norm = {
    hiddenSections: data.hiddenSections || { ko: [], en: [] },
    ko: data.ko || {},
    en: data.en || {}
  };
  await writeJsonAtomic(profilePath(active, 'ko'), fileObjFor('ko', norm));
  await writeJsonAtomic(profilePath(active, 'en'), fileObjFor('en', norm));
  const cfg = await readConfig();
  cfg.dataDir = dataDir;
  cfg.lang = (data.settings && data.settings.lang) || cfg.lang || 'en';
  if (Array.isArray(data.order)) cfg.order = data.order;
  if (Array.isArray(data.tableSections)) cfg.tableSections = data.tableSections;
  if (data.style && typeof data.style === 'object') cfg.style = data.style;
  await writeConfig(cfg);
  return { ok: true, path: dataDir };
}

// ---- Profile management ----------------------------------------------------
async function profilesList() {
  const names = await ensureProfiles();
  const cfg = await readConfig();
  const active = cfg.activeProfile && names.includes(cfg.activeProfile) ? cfg.activeProfile : names[0];
  return { ok: true, profiles: names, active };
}

async function switchProfile(name) {
  const names = await listProfileNames();
  if (!names.includes(name)) return { ok: false, error: '프로필을 찾을 수 없습니다.' };
  const cfg = await readConfig();
  cfg.activeProfile = name;
  await writeConfig(cfg);
  return { ok: true };
}

async function saveAsProfile(name, data) {
  const clean = sanitizeProfileName(name);
  if (!clean) return { ok: false, error: '프로필 이름이 올바르지 않습니다.' };
  const names = await listProfileNames();
  if (names.includes(clean)) return { ok: false, error: '같은 이름의 프로필이 이미 있습니다.' };
  const norm = {
    hiddenSections: (data && data.hiddenSections) || { ko: [], en: [] },
    ko: (data && data.ko) || {},
    en: (data && data.en) || {}
  };
  await writeJsonAtomic(profilePath(clean, 'ko'), fileObjFor('ko', norm));
  await writeJsonAtomic(profilePath(clean, 'en'), fileObjFor('en', norm));
  const cfg = await readConfig();
  cfg.activeProfile = clean;
  await writeConfig(cfg);
  return { ok: true, name: clean };
}

async function renameProfile(oldName, newName) {
  const clean = sanitizeProfileName(newName);
  if (!clean) return { ok: false, error: '이름이 올바르지 않습니다.' };
  const names = await listProfileNames();
  if (!names.includes(oldName)) return { ok: false, error: '원본 프로필이 없습니다.' };
  if (clean !== oldName && names.includes(clean)) return { ok: false, error: '같은 이름이 이미 있습니다.' };
  for (const lang of ['ko', 'en']) {
    const from = profilePath(oldName, lang);
    const to = profilePath(clean, lang);
    if (existsSync(from)) await fs.rename(from, to);
  }
  const cfg = await readConfig();
  if (cfg.activeProfile === oldName) {
    cfg.activeProfile = clean;
    await writeConfig(cfg);
  }
  return { ok: true, name: clean };
}

async function deleteProfile(name) {
  const names = await listProfileNames();
  if (!names.includes(name)) return { ok: false, error: '프로필이 없습니다.' };
  if (names.length <= 1) return { ok: false, error: '마지막 프로필은 삭제할 수 없습니다.' };
  for (const lang of ['ko', 'en']) {
    const f = profilePath(name, lang);
    try { if (existsSync(f)) await fs.unlink(f); } catch {}
  }
  const cfg = await readConfig();
  if (cfg.activeProfile === name) {
    cfg.activeProfile = names.filter((n) => n !== name)[0];
    await writeConfig(cfg);
  }
  return { ok: true };
}

function setupMenu() {
  const template = [
    {
      label: '파일',
      submenu: [
        { label: '저장', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('cv:menu', 'save') },
        { label: 'PDF로 내보내기', accelerator: 'CmdOrCtrl+P', click: () => mainWindow?.webContents.send('cv:menu', 'export') },
        { type: 'separator' },
        {
          label: '데이터 폴더 열기',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            if (dataDir) shell.openPath(dataDir);
          }
        },
        { type: 'separator' },
        { label: '종료', role: 'quit', accelerator: 'CmdOrCtrl+Q' }
      ]
    },
    {
      label: '편집',
      submenu: [
        { label: '실행 취소', role: 'undo', accelerator: 'CmdOrCtrl+Z' },
        { label: '다시 실행', role: 'redo', accelerator: 'CmdOrCtrl+Shift+Z' },
        { type: 'separator' },
        { label: '잘라내기', role: 'cut' },
        { label: '복사', role: 'copy' },
        { label: '붙여넣기', role: 'paste' },
        { label: '전체 선택', role: 'selectAll' }
      ]
    },
    {
      label: '보기',
      submenu: [
        { label: '확대', role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
        { label: '축소', role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { label: '실제 크기', role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
        { type: 'separator' },
        { label: '새로고침', role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { label: '개발자 도구', role: 'toggleDevTools', accelerator: 'F12' },
        { type: 'separator' },
        { label: '전체화면', role: 'togglefullscreen', accelerator: 'F11' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Probe the real packaged runtime and write a JSON report, then exit. Each step
// must prove itself with captured evidence (a value, a magic byte, a count).
async function runSmoke() {
  const steps = [];
  const rec = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const evalJs = (code) => mainWindow.webContents.executeJavaScript(code, true);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Optional: capture a PNG of the current window for README screenshots.
  const shot = async (name) => {
    if (!process.env.CVMAKER_SHOT_DIR) return;
    try {
      // Wait for the latest DOM to actually paint, else capturePage may grab a
      // stale (e.g. still-loading) frame.
      await mainWindow.webContents.executeJavaScript(
        'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))'
      );
      await new Promise((r) => setTimeout(r, 150));
      const img = await mainWindow.webContents.capturePage();
      await fs.writeFile(path.join(process.env.CVMAKER_SHOT_DIR, name), img.toPNG());
    } catch {}
  };
  try {
    try { mainWindow.show(); mainWindow.focus(); } catch {}
    // Renderer mounts + completes its IPC load (.app-main renders only when
    // state.data is set; the error box would mean the load failed).
    let mounted = false;
    for (let i = 0; i < 100; i++) {
      if (await evalJs("!!document.querySelector('.app-main') && !document.querySelector('.loading.error')")) {
        mounted = true;
        break;
      }
      await sleep(100);
    }
    rec('rendererLoaded', mounted, {});

    // Seed resolves in the packaged context, and the data load round-trips.
    const seed = resolveSeedPath();
    rec('seedResolved', existsSync(seed), { seed });
    const data = await loadCv();
    rec('loadCv', !!(data && data.ko && data.en && data.settings), {
      lang: data.settings && data.settings.lang,
      hasKo: !!data.ko,
      hasEn: !!data.en
    });
    const names = await listProfileNames();
    rec('profilesOnDisk', names.length > 0, { names });

    // The renderer actually rendered real data (brand, profile dropdown, nav).
    const brand = await evalJs("document.querySelector('.brand-name') ? document.querySelector('.brand-name').textContent : ''");
    rec('brandRendered', String(brand).includes('CV Maker'), { brand });
    const profileCount = await evalJs("document.querySelectorAll('.profile-select option').length");
    rec('profileDropdown', profileCount > 0, { profileCount });
    const navCount = await evalJs("document.querySelectorAll('.section-nav .nav-item').length");
    rec('sectionNav', navCount > 0, { navCount });
    await shot('editor.png'); // editor view (English)

    // Language toggle flips the active language in the live renderer.
    const langBefore = await evalJs("(document.querySelector('.lang-switch button.active') || {}).textContent || ''");
    await evalJs("var bs=[].slice.call(document.querySelectorAll('.lang-switch button')); var cur=document.querySelector('.lang-switch button.active'); var other=bs.filter(function(b){return b!==cur;})[0]; if(other) other.click(); true");
    await sleep(200);
    const langAfter = await evalJs("(document.querySelector('.lang-switch button.active') || {}).textContent || ''");
    rec('languageToggle', !!langBefore && !!langAfter && langBefore !== langAfter, { langBefore, langAfter });

    // PDF export path: switch to preview, wait for the paginated A4 sheets to
    // actually render (avoids capturing a blank page on a slow cold start),
    // mirror print-mode, then printToPDF (the exact call the real export uses).
    await evalJs("var ts=[].slice.call(document.querySelectorAll('.mode-tabs button')); var pv=ts.filter(function(b){return b.textContent.indexOf('미리보기')>=0;})[0]; if(pv) pv.click(); true");
    let pages = 0;
    for (let i = 0; i < 100; i++) {
      pages = await evalJs("document.querySelectorAll('.cv-sheet').length");
      if (pages > 0) break;
      await sleep(100);
    }

    // Style sidebar end-to-end: the 본문 크기 slider changes the live CSS var
    // (the rendered font-size grows), and the reset button restores it.
    const sizeBefore = await evalJs("getComputedStyle(document.querySelector('.cv-sheet')).fontSize");
    await evalJs("var rows=[].slice.call(document.querySelectorAll('.style-nav .style-row')); var row=rows.filter(function(r){return r.textContent.indexOf('본문')>=0;})[0]; var inp=row&&row.querySelector('input[type=range]'); if(inp){inp.value='15'; inp.dispatchEvent(new Event('input',{bubbles:true}));} true");
    await sleep(300);
    const sizeAfter = await evalJs("getComputedStyle(document.querySelector('.cv-sheet')).fontSize");
    rec('styleControl', parseFloat(sizeAfter) > parseFloat(sizeBefore), { sizeBefore, sizeAfter });
    await evalJs("var b=[].slice.call(document.querySelectorAll('.style-nav button')).filter(function(x){return x.textContent.indexOf('기본값')>=0;})[0]; if(b) b.click(); true");
    await sleep(300);
    const sizeReset = await evalJs("getComputedStyle(document.querySelector('.cv-sheet')).fontSize");
    rec('styleReset', sizeReset === sizeBefore, { sizeReset });
    await shot('preview.png'); // preview + style sidebar (Korean)

    await evalJs("document.body.classList.add('print-mode'); true");
    await sleep(300);
    const pdf = await mainWindow.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, pageSize: 'A4' });
    await evalJs("document.body.classList.remove('print-mode'); true");
    const magic = Buffer.from(pdf.slice(0, 5)).toString('latin1');
    rec('printToPDF', pages > 0 && magic === '%PDF-' && pdf.length > 3000, { pages, bytes: pdf.length, magic });
    if (process.env.CVMAKER_SMOKE_PDF) await fs.writeFile(process.env.CVMAKER_SMOKE_PDF, pdf);
  } catch (e) {
    rec('exception', false, { error: e.message });
  }
  const ok = steps.length > 0 && steps.every((s) => s.ok);
  try {
    if (process.env.CVMAKER_SMOKE_REPORT) {
      await fs.writeFile(process.env.CVMAKER_SMOKE_REPORT, JSON.stringify({ ok, steps }, null, 2), 'utf-8');
    }
  } catch {}
  app.exit(ok ? 0 : 1);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#f5f6f8',
    title: 'CV Maker',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      // Keep rAF/timers running for the headless smoke test even if the window
      // is backgrounded (the preview paginates via requestAnimationFrame).
      backgroundThrottling: !process.env.CVMAKER_SMOKE
    }
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Shipped-artifact smoke self-test: when CVMAKER_SMOKE is set, probe the real
  // packaged runtime (seed load, render, language toggle, PDF) and exit. Inert
  // in normal use. Driven by scripts/smoke.mjs against release/win-unpacked.
  if (process.env.CVMAKER_SMOKE) {
    mainWindow.webContents.once('did-finish-load', () => runSmoke());
  }

  mainWindow.on('blur', () => {
    mainWindow?.webContents.send('cv:hint-flush');
  });

  // Hold the window open until the renderer flushes pending edits, so a change
  // made within the autosave debounce window isn't lost on close / quit.
  let flushedForClose = false;
  mainWindow.on('close', (e) => {
    if (flushedForClose || !mainWindow || mainWindow.webContents.isDestroyed()) return;
    e.preventDefault();
    let done = false;
    const proceed = () => {
      if (done) return;
      done = true;
      ipcMain.removeListener('cv:flush-ack', proceed);
      flushedForClose = true;
      mainWindow.close();
    };
    ipcMain.once('cv:flush-ack', proceed);
    setTimeout(proceed, 2000); // fail-safe if the renderer is unresponsive
    mainWindow.webContents.send('cv:flush-request');
  });
}

async function exportPdf(defaultName) {
  if (!mainWindow) return { ok: false, error: 'no-window' };

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'PDF로 내보내기',
    defaultPath: defaultName || 'cv.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return { ok: false, canceled: true };

  await mainWindow.webContents.executeJavaScript(
    "document.body.classList.add('print-mode'); new Promise(r => setTimeout(r, 400));"
  );

  try {
    const pdfBuffer = await mainWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true, // honor the @page size + margins from cv-print.css
      pageSize: 'A4'
    });
    await fs.writeFile(filePath, pdfBuffer);
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    await mainWindow.webContents.executeJavaScript(
      "document.body.classList.remove('print-mode');"
    );
  }
}

// ---------- ORCID Public API ----------

async function fetchOrcidWorks(orcidId) {
  const id = normalizeOrcidId(orcidId);
  if (!id) {
    return { ok: false, error: 'ORCID ID 형식이 올바르지 않습니다 (예: 0000-0002-1825-0097)' };
  }

  let summaries;
  try {
    const res = await fetch(`https://pub.orcid.org/v3.0/${id}/works`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) {
      return { ok: false, error: `ORCID API 오류: ${res.status} ${res.statusText}` };
    }
    summaries = await res.json();
  } catch (e) {
    return { ok: false, error: `네트워크 오류: ${e.message}` };
  }

  const groups = summaries.group || [];
  const putCodes = [];
  const summaryByCode = new Map();

  for (const g of groups) {
    const s = g['work-summary']?.[0];
    if (!s) continue;
    const code = s['put-code'];
    if (code == null) continue;
    putCodes.push(code);
    summaryByCode.set(String(code), s);
  }

  // Fetch detailed works in chunks of 50 (ORCID API limit) to get contributors.
  const details = new Map();
  for (let i = 0; i < putCodes.length; i += 50) {
    const chunk = putCodes.slice(i, i + 50).join(',');
    try {
      const r = await fetch(`https://pub.orcid.org/v3.0/${id}/works/${chunk}`, {
        headers: { Accept: 'application/json' }
      });
      if (r.ok) {
        const data = await r.json();
        const bulk = data.bulk || [];
        for (const item of bulk) {
          const w = item.work;
          if (w && w['put-code'] != null) details.set(String(w['put-code']), w);
        }
      }
    } catch {
      // Non-fatal: fall back to summary-only data.
    }
  }

  const works = putCodes.map((code) => {
    const s = summaryByCode.get(String(code)) || {};
    const d = details.get(String(code));
    const title = s.title?.title?.value || d?.title?.title?.value || '';
    const venue =
      s['journal-title']?.value || d?.['journal-title']?.value || '';
    const yearRaw = s['publication-date']?.year?.value || d?.['publication-date']?.year?.value || '';
    const monthRaw = s['publication-date']?.month?.value || d?.['publication-date']?.month?.value || '';
    const type = s.type || d?.type || '';
    const ids = (s['external-ids']?.['external-id'] || d?.['external-ids']?.['external-id'] || []);
    const doi = ids.find((e) => e['external-id-type'] === 'doi')?.['external-id-value'] || '';
    const issn = ids.find((e) => e['external-id-type'] === 'issn')?.['external-id-value'] || '';
    const other = ids.find((e) => e['external-id-type'] === 'other-id')?.['external-id-value'] || '';

    let authors = '';
    if (d?.contributors?.contributor?.length) {
      authors = d.contributors.contributor
        .map((c) => c['credit-name']?.value)
        .filter(Boolean)
        .join(', ');
    }

    return {
      putCode: code,
      title,
      venue,
      year: yearRaw,
      month: monthRaw,
      date: monthRaw ? `${yearRaw}-${String(monthRaw).padStart(2, '0')}` : yearRaw,
      type,
      doi,
      issn,
      otherId: other,
      authors
    };
  });

  return { ok: true, works };
}

async function pickDataDir() {
  if (!mainWindow) return { ok: false };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '데이터 폴더 선택',
    defaultPath: dataDir,
    properties: ['openDirectory', 'createDirectory']
  });
  if (canceled || !filePaths.length) return { ok: false, canceled: true };
  const newDir = filePaths[0];
  setDataDir(newDir);
  await ensureDir(newDir);
  // loadCv() will seed/migrate the new folder if it has no language files yet.
  await writeConfig({ ...(await readConfig()), dataDir: newDir });
  return { ok: true, path: newDir };
}

// Import a language-specific data file. Screen the language by filename suffix
// (_KR/_KO → ko, _EN → en); accept either our { cv, hidden } file or a raw cv object.
async function importData() {
  if (!mainWindow) return { ok: false };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '이력서 데이터 불러오기',
    defaultPath: dataDir,
    filters: [{ name: 'CV data (JSON)', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths.length) return { ok: false, canceled: true };
  const file = filePaths[0];
  const lang = screenImportLang(path.basename(file));
  if (!lang) {
    return {
      ok: false,
      error: '파일명에서 언어를 찾을 수 없습니다. 파일명이 ..._KR.json 또는 ..._EN.json 형식이어야 합니다.'
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(file, 'utf-8'));
  } catch (e) {
    return { ok: false, error: `JSON을 읽을 수 없습니다: ${e.message}` };
  }
  if (!looksLikeCv(parsed)) {
    return { ok: false, error: 'CV 데이터 형식이 아닙니다 (인식할 수 있는 항목이 없습니다).' };
  }
  const cv = parsed && parsed.cv ? parsed.cv : parsed;
  const hidden = parsed && Array.isArray(parsed.hidden) ? parsed.hidden : [];
  return { ok: true, lang, cv, hidden, path: file };
}

// Export a JSON file to a chosen location (content is built by the renderer).
async function exportData(defaultName, content) {
  if (!mainWindow) return { ok: false };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '데이터 내보내기 (JSON)',
    defaultPath: defaultName || 'cv.json',
    filters: [{ name: 'CV data (JSON)', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  try {
    await fs.writeFile(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf-8');
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

app.whenReady().then(async () => {
  await initPaths();

  ipcMain.handle('cv:load', async () => {
    try {
      return { ok: true, data: await loadCv() };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('cv:save', async (_e, data) => {
    try {
      return await saveCv(data);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('cv:exportPdf', (_e, defaultName) => exportPdf(defaultName));
  ipcMain.handle('cv:pickDataDir', () => pickDataDir());
  ipcMain.handle('cv:import', () => importData());
  ipcMain.handle('cv:export', (_e, defaultName, content) => exportData(defaultName, content));
  ipcMain.handle('cv:profiles:list', () => profilesList());
  ipcMain.handle('cv:profiles:switch', (_e, name) => switchProfile(name));
  ipcMain.handle('cv:profiles:saveAs', (_e, name, data) => saveAsProfile(name, data));
  ipcMain.handle('cv:profiles:rename', (_e, oldName, newName) => renameProfile(oldName, newName));
  ipcMain.handle('cv:profiles:delete', (_e, name) => deleteProfile(name));
  ipcMain.handle('cv:getPaths', () => ({
    dataPath: dataDir,
    dataDir,
    krPath,
    enPath,
    userData: app.getPath('userData')
  }));
  ipcMain.handle('cv:fetchOrcid', (_e, orcidId) => fetchOrcidWorks(orcidId));
  ipcMain.handle('cv:openExternal', (_e, url) => {
    try {
      const { protocol } = new URL(String(url));
      if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') {
        return shell.openExternal(url);
      }
    } catch {
      // malformed URL — ignore
    }
    return false;
  });

  setupMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
