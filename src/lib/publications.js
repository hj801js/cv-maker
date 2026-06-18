// Pure helpers for classifying ORCID work types and ordering publications/patents.
// No Vue / Electron imports, so they can be unit-tested in isolation.

// Loose title key for duplicate detection: lowercase, keep only letters,
// digits, and Hangul syllables (drops spacing/punctuation differences).
export function normalizeTitle(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

const JOURNAL_TYPES = new Set([
  'journal-article',
  'review',
  'magazine-article',
  'newsletter-article'
]);
const CONFERENCE_TYPES = new Set([
  'conference-paper',
  'conference-abstract',
  'conference-poster'
]);
const PATENT_TYPES = new Set(['patent']);

// Map an ORCID work type to a CV bucket, or null if it doesn't fit one.
export function classify(type) {
  const t = String(type || '').toLowerCase();
  if (JOURNAL_TYPES.has(t)) return 'journal';
  if (CONFERENCE_TYPES.has(t)) return 'conference';
  if (PATENT_TYPES.has(t)) return 'patent';
  return null;
}

// ----- Newest-first sort keys (higher = newer) -----

// Publication date "YYYY" or "YYYY-MM" -> YYYY*100 + MM (month 0 if absent), -1 if none.
export function pubDateKey(p) {
  const m = String((p && p.date) || '').match(/(\d{4})(?:-(\d{1,2}))?/);
  return m ? Number(m[1]) * 100 + (m[2] ? Number(m[2]) : 0) : -1;
}

// Patent year -> the year number, or -1 if not a finite number.
export function patentYearKey(p) {
  const y = Number(p && p.year);
  return Number.isFinite(y) ? y : -1;
}

// Stable descending sort by keyFn (ties keep their original relative order).
export function sortDescStable(arr, keyFn) {
  if (!Array.isArray(arr)) return arr;
  return arr
    .map((v, i) => [v, i])
    .sort((a, b) => keyFn(b[0]) - keyFn(a[0]) || a[1] - b[1])
    .map((x) => x[0]);
}

// Sort a CV root's journals/conferences (by date) and patents (by year) newest-first.
export function sortPublicationsNewestFirst(root) {
  if (!root) return;
  if (root.publications) {
    root.publications.journals = sortDescStable(root.publications.journals, pubDateKey);
    root.publications.conferences = sortDescStable(root.publications.conferences, pubDateKey);
  }
  if (Array.isArray(root.patents)) root.patents = sortDescStable(root.patents, patentYearKey);
}
