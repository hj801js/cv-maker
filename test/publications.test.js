import { describe, it, expect } from 'vitest';
import {
  normalizeTitle,
  classify,
  pubDateKey,
  patentYearKey,
  sortDescStable,
  sortPublicationsNewestFirst
} from '../src/lib/publications.js';

describe('normalizeTitle (duplicate-detection key)', () => {
  it('lowercases and drops spacing/punctuation', () => {
    expect(normalizeTitle('A Study of MMC!')).toBe('astudyofmmc');
    expect(normalizeTitle('  Hello, World.  ')).toBe('helloworld');
  });
  it('keeps Hangul and digits', () => {
    expect(normalizeTitle('한글 제목 12')).toBe('한글제목12');
  });
  it('treats two titles differing only by spacing/case as equal', () => {
    expect(normalizeTitle('DC Fault Blocking')).toBe(normalizeTitle('dc-fault  blocking'));
  });
  it('handles null/undefined', () => {
    expect(normalizeTitle(null)).toBe('');
    expect(normalizeTitle(undefined)).toBe('');
  });
});

describe('classify (ORCID work type -> bucket)', () => {
  it('maps journal-like types', () => {
    expect(classify('journal-article')).toBe('journal');
    expect(classify('review')).toBe('journal');
  });
  it('maps conference-like types', () => {
    expect(classify('conference-paper')).toBe('conference');
    expect(classify('conference-poster')).toBe('conference');
  });
  it('maps patents', () => {
    expect(classify('patent')).toBe('patent');
  });
  it('is case-insensitive', () => {
    expect(classify('JOURNAL-ARTICLE')).toBe('journal');
  });
  it('returns null for unknown / empty', () => {
    expect(classify('data-set')).toBeNull();
    expect(classify('')).toBeNull();
    expect(classify(undefined)).toBeNull();
  });
});

describe('pubDateKey (newest-first sort key)', () => {
  it('encodes YYYY-MM as YYYY*100 + MM', () => {
    expect(pubDateKey({ date: '2020-05' })).toBe(202005);
  });
  it('treats a year-only date as month 0', () => {
    expect(pubDateKey({ date: '2019' })).toBe(201900);
  });
  it('accepts a single-digit month', () => {
    expect(pubDateKey({ date: '2021-3' })).toBe(202103);
  });
  it('returns -1 when there is no parseable date', () => {
    expect(pubDateKey({ date: '' })).toBe(-1);
    expect(pubDateKey({})).toBe(-1);
    expect(pubDateKey(null)).toBe(-1);
  });
  it('orders later dates above earlier ones', () => {
    expect(pubDateKey({ date: '2020-12' })).toBeGreaterThan(pubDateKey({ date: '2020-02' }));
    expect(pubDateKey({ date: '2020-01' })).toBeGreaterThan(pubDateKey({ date: '2019-12' }));
  });
});

describe('patentYearKey', () => {
  it('returns the numeric year', () => {
    expect(patentYearKey({ year: 2018 })).toBe(2018);
    expect(patentYearKey({ year: '2017' })).toBe(2017);
  });
  it('returns -1 for missing / non-numeric years', () => {
    expect(patentYearKey({})).toBe(-1);
    expect(patentYearKey({ year: 'n/a' })).toBe(-1);
    expect(patentYearKey(undefined)).toBe(-1);
  });
});

describe('sortDescStable', () => {
  it('sorts by key descending', () => {
    const out = sortDescStable([{ n: 1 }, { n: 3 }, { n: 2 }], (x) => x.n);
    expect(out.map((x) => x.n)).toEqual([3, 2, 1]);
  });
  it('keeps original order among equal keys (stable)', () => {
    const a = { id: 'a', k: 1 };
    const b = { id: 'b', k: 1 };
    const c = { id: 'c', k: 1 };
    const out = sortDescStable([a, b, c], (x) => x.k);
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
  it('returns non-arrays unchanged', () => {
    expect(sortDescStable(undefined, () => 0)).toBeUndefined();
  });
});

describe('sortPublicationsNewestFirst', () => {
  it('sorts journals and conferences by date, patents by year, newest first', () => {
    const root = {
      publications: {
        journals: [
          { title: 'old', date: '2015' },
          { title: 'new', date: '2022-06' },
          { title: 'mid', date: '2019-01' }
        ],
        conferences: [
          { title: 'c1', date: '2020' },
          { title: 'c2', date: '2021' }
        ]
      },
      patents: [
        { title: 'p-old', year: 2010 },
        { title: 'p-new', year: 2020 }
      ]
    };
    sortPublicationsNewestFirst(root);
    expect(root.publications.journals.map((j) => j.title)).toEqual(['new', 'mid', 'old']);
    expect(root.publications.conferences.map((c) => c.title)).toEqual(['c2', 'c1']);
    expect(root.patents.map((p) => p.title)).toEqual(['p-new', 'p-old']);
  });
  it('keeps insertion order for entries with the same date (stable)', () => {
    const root = {
      publications: {
        journals: [
          { title: 'first', date: '2020' },
          { title: 'second', date: '2020' }
        ],
        conferences: []
      },
      patents: []
    };
    sortPublicationsNewestFirst(root);
    expect(root.publications.journals.map((j) => j.title)).toEqual(['first', 'second']);
  });
  it('does not throw on missing publications/patents', () => {
    expect(() => sortPublicationsNewestFirst({})).not.toThrow();
    expect(() => sortPublicationsNewestFirst(null)).not.toThrow();
  });
});
