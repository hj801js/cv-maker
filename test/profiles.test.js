import { describe, it, expect } from 'vitest';
import {
  sanitizeProfileName,
  profileBaseFromFile,
  screenImportLang,
  looksLikeCv,
  normalizeOrcidId,
  normalizeCombined
} from '../electron/lib/profiles.js';

describe('sanitizeProfileName', () => {
  it('removes characters illegal in Windows filenames', () => {
    expect(sanitizeProfileName('a<b>c:d"e/f\\g|h?i*j')).toBe('abcdefghij');
  });
  it('trims surrounding whitespace', () => {
    expect(sanitizeProfileName('  내 이력서  ')).toBe('내 이력서');
  });
  it('keeps Hangul and ordinary characters', () => {
    expect(sanitizeProfileName('홍길동_2026')).toBe('홍길동_2026');
  });
  it('caps the length at 60 characters', () => {
    expect(sanitizeProfileName('x'.repeat(100))).toHaveLength(60);
  });
  it('returns empty string for null/undefined', () => {
    expect(sanitizeProfileName(null)).toBe('');
    expect(sanitizeProfileName(undefined)).toBe('');
  });
});

describe('profileBaseFromFile', () => {
  it('extracts the base name from a per-language file', () => {
    expect(profileBaseFromFile('cv_KR.json')).toBe('cv');
    expect(profileBaseFromFile('cv_EN.json')).toBe('cv');
    expect(profileBaseFromFile('기본_KO.json')).toBe('기본');
    expect(profileBaseFromFile('My CV_EN.json')).toBe('My CV');
  });
  it('is case-insensitive on the suffix and extension', () => {
    expect(profileBaseFromFile('cv_kr.json')).toBe('cv');
  });
  it('returns null for files that are not a language pair', () => {
    expect(profileBaseFromFile('notes.json')).toBeNull();
    expect(profileBaseFromFile('cv_FR.json')).toBeNull();
    expect(profileBaseFromFile('cv_EN.txt')).toBeNull();
    expect(profileBaseFromFile('')).toBeNull();
  });
});

describe('screenImportLang', () => {
  it('detects Korean from _KR / _KO', () => {
    expect(screenImportLang('cv_KR.json')).toBe('ko');
    expect(screenImportLang('cv_KO.json')).toBe('ko');
    expect(screenImportLang('resume-kr.json')).toBe('ko');
  });
  it('detects English from _EN', () => {
    expect(screenImportLang('cv_EN.json')).toBe('en');
    expect(screenImportLang('resume-en.json')).toBe('en');
  });
  it('requires the suffix at a word boundary (no false positives)', () => {
    // "token" ends in "en" but not preceded by a separator/start
    expect(screenImportLang('token.json')).toBeNull();
    // "england" does not end in the suffix
    expect(screenImportLang('england.json')).toBeNull();
  });
  it('returns null when the name does not encode a language', () => {
    expect(screenImportLang('cv.json')).toBeNull();
    expect(screenImportLang('data_2026.json')).toBeNull();
    expect(screenImportLang('')).toBeNull();
  });
});

describe('looksLikeCv', () => {
  it('accepts our { cv, hidden } wrapper', () => {
    expect(looksLikeCv({ cv: { basicInfo: {} }, hidden: [] })).toBe(true);
  });
  it('accepts a raw cv object with a recognized section', () => {
    expect(looksLikeCv({ basicInfo: {}, summary: 'hi' })).toBe(true);
  });
  it('accepts a wrapper carrying _meta even if cv is empty', () => {
    expect(looksLikeCv({ _meta: { schemaVersion: 4 }, cv: {} })).toBe(true);
  });
  it('rejects unrelated objects, arrays, and primitives', () => {
    expect(looksLikeCv({ foo: 'bar' })).toBe(false);
    expect(looksLikeCv([1, 2, 3])).toBe(false);
    expect(looksLikeCv('string')).toBe(false);
    expect(looksLikeCv(null)).toBe(false);
  });
});

describe('normalizeOrcidId', () => {
  it('passes through a bare id', () => {
    expect(normalizeOrcidId('0000-0002-1825-0097')).toBe('0000-0002-1825-0097');
  });
  it('extracts the id from an ORCID URL', () => {
    expect(normalizeOrcidId('https://orcid.org/0000-0002-1825-0097')).toBe('0000-0002-1825-0097');
  });
  it('accepts the trailing X checksum digit', () => {
    expect(normalizeOrcidId('0000-0002-3486-357X')).toBe('0000-0002-3486-357X');
  });
  it('returns null for malformed input', () => {
    expect(normalizeOrcidId('not-an-orcid')).toBeNull();
    expect(normalizeOrcidId('')).toBeNull();
    expect(normalizeOrcidId(null)).toBeNull();
  });
});

describe('normalizeCombined (migration to { ko, en })', () => {
  it('passes a combined ko/en object through, preserving settings/hidden', () => {
    const ko = { basicInfo: { name: '김' } };
    const en = { basicInfo: { name: 'Kim' } };
    const out = normalizeCombined({
      ko, en,
      settings: { lang: 'ko' },
      hiddenSections: { ko: ['specialties'], en: [] }
    });
    expect(out.ko).toBe(ko);
    expect(out.en).toBe(en);
    expect(out.settings).toEqual({ lang: 'ko' });
    expect(out.hiddenSections).toEqual({ ko: ['specialties'], en: [] });
  });

  it('copies a legacy single-language body into both languages (independent copies)', () => {
    const out = normalizeCombined({ basicInfo: { name: 'X' }, summary: 'hi', _meta: { v: 1 } });
    expect(out.ko.summary).toBe('hi');
    expect(out.en.summary).toBe('hi');
    expect(out.en).not.toBe(out.ko); // deep-copied, not shared reference
    expect(out.ko).not.toHaveProperty('_meta'); // _meta stripped from the body
  });

  it('produces a valid empty shape for empty / undefined input', () => {
    const out = normalizeCombined(undefined);
    expect(out.ko).toEqual({});
    expect(out.en).toEqual({});
    expect(out.hiddenSections).toEqual({ ko: [], en: [] });
    expect(out.settings).toHaveProperty('lang');
  });
});
