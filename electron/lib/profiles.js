// Pure helpers shared by the Electron main process and the unit tests.
// ESM exports so the vite-plugin-electron (rollup) build inlines them into the
// main bundle, and Vitest can import them directly.

// Strip characters that are illegal in Windows filenames, trim, cap length.
export function sanitizeProfileName(name) {
  return String(name || '').replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 60);
}

// Base profile name from a per-language data file name, or null if it isn't one.
// Expects a bare file name (as from fs.readdir), e.g. "기본_KR.json" -> "기본".
export function profileBaseFromFile(filename) {
  const m = String(filename || '').match(/^(.+)_(KR|KO|EN)\.json$/i);
  return m ? m[1] : null;
}

// Which language an import file targets, screened by filename suffix
// (..._KR/..._KO -> ko, ..._EN -> en). Returns null if the name doesn't say.
export function screenImportLang(filename) {
  const stem = String(filename || '').replace(/\.json$/i, '');
  if (/(^|[_-])(kr|ko)$/i.test(stem)) return 'ko';
  if (/(^|[_-])en$/i.test(stem)) return 'en';
  return null;
}

const CV_FIELDS = [
  'basicInfo', 'summary', 'specialties', 'certifications', 'memberships',
  'researchField', 'experiences', 'projects', 'hardwareExperiences',
  'education', 'publications', 'patents', 'skills'
];

// Does a parsed import file look like our CV data — either our { cv, hidden }
// wrapper or a raw cv object with at least one recognized section?
export function looksLikeCv(parsed) {
  const cv = parsed && parsed.cv ? parsed.cv : parsed;
  return !!(
    cv && typeof cv === 'object' && !Array.isArray(cv) &&
    (CV_FIELDS.some((k) => k in cv) || (parsed && parsed._meta))
  );
}

// Pull a canonical ORCID id (0000-0000-0000-000X) out of an id or URL, or null.
export function normalizeOrcidId(input) {
  const m = String(input || '').match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/);
  return m ? m[1] : null;
}

// Normalize any legacy/combined object to { settings, hiddenSections, ko, en }.
// A combined { ko, en } object passes through; a legacy single-language body is
// copied into both languages.
export function normalizeCombined(obj) {
  const src = obj && typeof obj === 'object' ? obj : {};
  if (src.ko && src.en) {
    return {
      settings: src.settings || { lang: 'en' },
      hiddenSections: src.hiddenSections || { ko: [], en: [] },
      ko: src.ko,
      en: src.en
    };
  }
  const { _meta, settings, hiddenSections, ...body } = src;
  return {
    settings: settings || { lang: 'ko' },
    hiddenSections: hiddenSections || { ko: [], en: [] },
    ko: body,
    en: JSON.parse(JSON.stringify(body))
  };
}
