import { reactive, ref, watch, computed, onMounted, onBeforeUnmount } from 'vue';
import { MAIN_SECTION_KEYS } from '../schema.js';
import { normalizeOrder } from '../lib/order.js';
import { normalizeTitle, classify, sortPublicationsNewestFirst } from '../lib/publications.js';

const state = reactive({
  data: null,
  loading: true,
  saving: false,
  syncing: false,
  dirty: false,
  error: null,
  dataPath: '',
  dataDir: '',
  profiles: [],
  activeProfile: '',
  lastSavedAt: null
});

// Active output/edit language and its CV root. The whole CV exists twice
// (state.data.ko / state.data.en); the toggle just selects which one is live.
const lang = computed(
  () => (state.data && state.data.settings && state.data.settings.lang) || 'en'
);
const active = computed(() => (state.data ? state.data[lang.value] || {} : {}));

function setLang(l) {
  if (!state.data) return;
  if (!state.data.settings) state.data.settings = {};
  state.data.settings.lang = l;
  if (!state.data[l] || typeof state.data[l] !== 'object') state.data[l] = {};
  if (!state.data.hiddenSections) state.data.hiddenSections = { ko: [], en: [] };
  if (!Array.isArray(state.data.hiddenSections[l])) state.data.hiddenSections[l] = [];
}

function isSectionVisible(key) {
  if (!state.data || !state.data.hiddenSections) return true;
  const h = state.data.hiddenSections[lang.value];
  return !Array.isArray(h) || !h.includes(key);
}

function toggleSection(key) {
  if (!state.data) return;
  if (!state.data.hiddenSections) state.data.hiddenSections = { ko: [], en: [] };
  const l = lang.value;
  if (!Array.isArray(state.data.hiddenSections[l])) state.data.hiddenSections[l] = [];
  const arr = state.data.hiddenSections[l];
  const i = arr.indexOf(key);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(key);
}

// Shared output order of the reorderable big sections (basicInfo is pinned).
const order = computed(() => normalizeOrder(state.data && state.data.order, MAIN_SECTION_KEYS));

function moveSection(key, delta) {
  if (!state.data) return;
  const cur = order.value.slice();
  const i = cur.indexOf(key);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= cur.length) return;
  [cur[i], cur[j]] = [cur[j], cur[i]];
  state.data.order = cur;
}

// Korean table-style sections (applied only when the active language is Korean).
const tableSections = computed(() => (Array.isArray(state.data && state.data.tableSections) ? state.data.tableSections : []));
function isTableOn(key) {
  return tableSections.value.includes(key);
}
function toggleTable(key) {
  if (!state.data) return;
  if (!Array.isArray(state.data.tableSections)) state.data.tableSections = [];
  const arr = state.data.tableSections;
  const i = arr.indexOf(key);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(key);
}

// ----- Document style (font sizes, line height, rule width) -----
// App-level (persisted in config.json), surfaced to the preview/PDF as CSS vars.
const DEFAULT_STYLE = {
  nameSize: 28,
  headingSize: 13.5,
  bodySize: 12,
  lineHeight: 1.5,
  ruleWidth: 1.5
};
const styleVars = computed(() => {
  const s = (state.data && state.data.style) || DEFAULT_STYLE;
  const n = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  return {
    '--cv-name-size': `${n(s.nameSize, DEFAULT_STYLE.nameSize)}px`,
    '--cv-heading-size': `${n(s.headingSize, DEFAULT_STYLE.headingSize)}px`,
    '--cv-body-size': `${n(s.bodySize, DEFAULT_STYLE.bodySize)}px`,
    '--cv-line-height': String(n(s.lineHeight, DEFAULT_STYLE.lineHeight)),
    '--cv-rule-width': `${n(s.ruleWidth, DEFAULT_STYLE.ruleWidth)}px`
  };
});
function setStyle(key, value) {
  if (!state.data) return;
  if (!state.data.style || typeof state.data.style !== 'object') state.data.style = { ...DEFAULT_STYLE };
  state.data.style[key] = value;
}
function resetStyle() {
  if (!state.data) return;
  state.data.style = { ...DEFAULT_STYLE };
}

let initialized = false;
let suppressWatch = false;
let debounceTimer = null;

const DEBOUNCE_MS = 1000;

async function flush() {
  if (!state.data) return;
  if (!state.dirty) return;
  state.saving = true;
  try {
    const res = await window.cvAPI.save(JSON.parse(JSON.stringify(state.data)));
    if (res.ok) {
      state.dirty = false;
      state.lastSavedAt = new Date();
    } else {
      state.error = res.error || '저장 실패';
    }
  } catch (e) {
    state.error = e.message;
  } finally {
    state.saving = false;
  }
}

function scheduleSave() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    flush();
  }, DEBOUNCE_MS);
}

async function load() {
  state.loading = true;
  state.error = null;
  try {
    const res = await window.cvAPI.load();
    if (res.ok) {
      suppressWatch = true;
      state.data = res.data;
      // Make sure both language roots and ancillary fields exist (defensive).
      if (!state.data.settings) state.data.settings = { lang: 'en' };
      if (!state.data.ko || typeof state.data.ko !== 'object') state.data.ko = {};
      if (!state.data.en || typeof state.data.en !== 'object') state.data.en = {};
      if (!state.data.hiddenSections) state.data.hiddenSections = { ko: [], en: [] };
      if (!Array.isArray(state.data.tableSections)) state.data.tableSections = [];
      state.data.style = { ...DEFAULT_STYLE, ...(state.data.style && typeof state.data.style === 'object' ? state.data.style : {}) };
      state.data.order = order.value; // normalize to the full reorderable set
      // resume deep-watch on next tick
      setTimeout(() => { suppressWatch = false; }, 0);
      state.dirty = false;
    } else {
      state.error = res.error;
    }
    const paths = await window.cvAPI.getPaths();
    state.dataPath = paths.dataPath;
    state.dataDir = paths.dataDir;
    if (window.cvAPI.profilesList) {
      const pl = await window.cvAPI.profilesList();
      if (pl && pl.ok) {
        state.profiles = pl.profiles || [];
        state.activeProfile = pl.active || '';
      }
    }
  } catch (e) {
    state.error = e.message;
  } finally {
    state.loading = false;
  }
}

function markDirty() {
  if (suppressWatch) return;
  state.dirty = true;
  scheduleSave();
}

function setupWatchers() {
  watch(
    () => state.data,
    () => markDirty(),
    { deep: true }
  );
}

let unbindFlushHint = null;

function setupWindowHooks() {
  // Save on window blur (main process sends a hint)
  if (window.cvAPI && window.cvAPI.onFlushHint) {
    unbindFlushHint = window.cvAPI.onFlushHint(() => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      flush();
    });
  }
  // Save before unload (fires on reload; best-effort, not awaitable)
  window.addEventListener('beforeunload', () => {
    if (state.dirty) flush();
  });
  // Reliable save on window close / app quit: the main process holds the close
  // until we flush and acknowledge (see electron/main.js close handler).
  if (window.cvAPI && window.cvAPI.onFlushRequest) {
    window.cvAPI.onFlushRequest(async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      try {
        await flush();
      } catch {
        // ignore — we must still acknowledge so the window can close
      } finally {
        window.cvAPI.flushAck?.();
      }
    });
  }
}

function toPubEntry(w) {
  return {
    authors: w.authors || '',
    title: w.title || '',
    venue: w.venue || '',
    date: w.date || ''
  };
}

function toPatentEntry(w) {
  return {
    authors: w.authors || '',
    title: w.title || '',
    number: w.doi || w.otherId || '',
    year: Number(w.year) || null,
    status: 'Registered'
  };
}

async function syncOrcid() {
  // ORCID works are added to the currently active language's CV.
  const root = active.value;
  const orcid = root?.basicInfo?.orcid;
  if (!orcid) {
    return { ok: false, error: '기본 정보에 ORCID ID를 먼저 입력하세요.' };
  }
  state.syncing = true;
  try {
    const res = await window.cvAPI.fetchOrcid(orcid);
    if (!res.ok) return res;

    const works = res.works || [];
    const buckets = { journal: [], conference: [], patent: [], other: [] };
    for (const w of works) {
      const cls = classify(w.type) || 'other';
      buckets[cls].push(w);
    }

    if (!root.publications) root.publications = { journals: [], conferences: [] };
    if (!Array.isArray(root.publications.journals)) root.publications.journals = [];
    if (!Array.isArray(root.publications.conferences)) root.publications.conferences = [];
    if (!Array.isArray(root.patents)) root.patents = [];

    const existingJournals = new Set(
      root.publications.journals.map((p) => normalizeTitle(p.title))
    );
    const existingConfs = new Set(
      root.publications.conferences.map((p) => normalizeTitle(p.title))
    );
    const existingPatents = new Set(
      root.patents.map((p) => normalizeTitle(p.title))
    );

    let addedJ = 0;
    let addedC = 0;
    let addedP = 0;
    let skipped = 0;

    for (const w of buckets.journal) {
      const k = normalizeTitle(w.title);
      if (!k || existingJournals.has(k)) {
        skipped++;
        continue;
      }
      existingJournals.add(k);
      root.publications.journals.push(toPubEntry(w));
      addedJ++;
    }
    for (const w of buckets.conference) {
      const k = normalizeTitle(w.title);
      if (!k || existingConfs.has(k)) {
        skipped++;
        continue;
      }
      existingConfs.add(k);
      root.publications.conferences.push(toPubEntry(w));
      addedC++;
    }
    for (const w of buckets.patent) {
      const k = normalizeTitle(w.title);
      if (!k || existingPatents.has(k)) {
        skipped++;
        continue;
      }
      existingPatents.add(k);
      root.patents.push(toPatentEntry(w));
      addedP++;
    }

    // Keep journals/conferences/patents newest-first after importing.
    sortPublicationsNewestFirst(root);

    return {
      ok: true,
      summary: {
        total: works.length,
        addedJournals: addedJ,
        addedConferences: addedC,
        addedPatents: addedP,
        skippedDuplicates: skipped,
        unclassified: buckets.other.length
      }
    };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    state.syncing = false;
  }
}

// Import a language-specific data file (language screened by filename in main).
// Replaces that language's resume with the file's content and switches to it.
async function importData() {
  const res = await window.cvAPI.import();
  if (!res.ok) return res;
  if (!state.data) return { ok: false, error: '데이터가 아직 로드되지 않았습니다.' };
  const l = res.lang === 'ko' ? 'ko' : 'en';
  state.data[l] = res.cv || {};
  if (!state.data.hiddenSections) state.data.hiddenSections = { ko: [], en: [] };
  state.data.hiddenSections[l] = Array.isArray(res.hidden) ? res.hidden : [];
  setLang(l); // switch to the imported language
  state.dirty = true;
  await flush(); // persist immediately to the active profile
  return { ok: true, lang: l };
}

// Export the active language's data as <profile>_KR/EN.json (import-compatible).
async function exportData() {
  await flushPending();
  const l = lang.value;
  const content = {
    _meta: { schemaVersion: 4, lang: l },
    hidden: (state.data && state.data.hiddenSections && state.data.hiddenSections[l]) || [],
    cv: active.value || {}
  };
  const name = `${state.activeProfile || 'cv'}_${l === 'ko' ? 'KR' : 'EN'}.json`;
  return await window.cvAPI.export(name, JSON.stringify(content, null, 2));
}

// ----- Profiles (named CVs) -----
async function flushPending() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (state.dirty) await flush();
}

async function switchProfile(name) {
  if (!name || name === state.activeProfile) return { ok: true };
  await flushPending(); // persist current profile first
  const res = await window.cvAPI.profilesSwitch(name);
  if (!res.ok) return res;
  await load();
  return { ok: true };
}

async function saveAsProfile(name) {
  await flushPending();
  const snapshot = JSON.parse(JSON.stringify(state.data));
  const res = await window.cvAPI.profilesSaveAs(name, snapshot);
  if (res.ok) await load();
  return res;
}

async function renameProfile(oldName, newName) {
  const res = await window.cvAPI.profilesRename(oldName, newName);
  if (res.ok) await load();
  return res;
}

async function deleteProfile(name) {
  const res = await window.cvAPI.profilesDelete(name);
  if (res.ok) await load();
  return res;
}

export function useCv() {
  if (!initialized) {
    initialized = true;
    setupWatchers();
    setupWindowHooks();
    load();
  }

  return {
    state,
    lang,
    active,
    setLang,
    isSectionVisible,
    toggleSection,
    order,
    moveSection,
    isTableOn,
    toggleTable,
    styleVars,
    setStyle,
    resetStyle,
    load,
    save: flush,
    async exportPdf() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (state.dirty) await flush();
      // Filenames are always English/ASCII, regardless of the active language:
      // prefer the English resume's name, then the active resume's English name.
      const enInfo = state.data?.en?.basicInfo || {};
      const actInfo = active.value?.basicInfo || {};
      let baseName = enInfo.name || actInfo.nameEn || enInfo.nameEn || actInfo.name || 'CV';
      baseName = String(baseName).trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9._-]/g, '');
      if (!baseName) baseName = 'CV';
      const year = new Date().getFullYear();
      const langWord = lang.value === 'ko' ? 'KO' : 'EN';
      const name = `CV_${baseName}_${year}_${langWord}.pdf`;
      return await window.cvAPI.exportPdf(name);
    },
    async pickDataDir() {
      const res = await window.cvAPI.pickDataDir();
      if (res.ok) {
        await load();
      }
      return res;
    },
    syncOrcid,
    importData,
    exportData,
    switchProfile,
    saveAsProfile,
    renameProfile,
    deleteProfile
  };
}
