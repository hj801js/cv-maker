import { describe, it, expect } from 'vitest';
import { normalizeCv } from '../src/lib/normalizeCv.js';

describe('normalizeCv', () => {
  it('preserves valid data unchanged (by value)', () => {
    const cv = {
      basicInfo: { name: 'Kim' },
      summary: 'hi',
      specialties: ['a', 'b'],
      experiences: [{ company: 'X' }],
      publications: { journals: [{ title: 'J' }], conferences: [{ title: 'C' }] },
      skills: { technical: ['C++'], languages: [{ name: 'EN', level: 'pro' }] },
      researchField: { title: 'RF', items: ['x'] }
    };
    const out = normalizeCv(cv);
    expect(out.basicInfo).toEqual({ name: 'Kim' });
    expect(out.summary).toBe('hi');
    expect(out.specialties).toEqual(['a', 'b']);
    expect(out.experiences).toEqual([{ company: 'X' }]);
    expect(out.publications.journals).toEqual([{ title: 'J' }]);
    expect(out.skills.technical).toEqual(['C++']);
    expect(out.researchField.items).toEqual(['x']);
  });

  it('coerces wrong-typed sections to safe defaults', () => {
    const out = normalizeCv({
      basicInfo: 'oops',            // should become {}
      summary: { bad: true },       // should become ''
      specialties: 'not-an-array',  // should become []
      experiences: { 0: 'x' },      // should become []
      publications: 'nope',         // -> { journals: [], conferences: [] }
      skills: null,                 // -> { technical: [], languages: [] }
      researchField: []             // -> { title: '', items: [] }
    });
    expect(out.basicInfo).toEqual({});
    expect(out.summary).toBe('');
    expect(out.specialties).toEqual([]);
    expect(out.experiences).toEqual([]);
    expect(out.publications).toEqual({ journals: [], conferences: [] });
    expect(out.skills).toEqual({ technical: [], languages: [] });
    expect(out.researchField).toEqual({ title: '', items: [] });
  });

  it('fills in every expected section for empty / non-object input', () => {
    for (const input of [undefined, null, 'x', 42, []]) {
      const out = normalizeCv(input);
      expect(out.basicInfo).toEqual({});
      expect(Array.isArray(out.experiences)).toBe(true);
      expect(Array.isArray(out.education)).toBe(true);
      expect(Array.isArray(out.patents)).toBe(true);
      expect(out.publications.journals).toEqual([]);
      expect(out.skills.languages).toEqual([]);
    }
  });

  it('keeps partial nested data and only patches the missing half', () => {
    const out = normalizeCv({ publications: { journals: [{ title: 'J' }] } }); // conferences missing
    expect(out.publications.journals).toEqual([{ title: 'J' }]);
    expect(out.publications.conferences).toEqual([]);
  });

  it('preserves unknown extra fields', () => {
    const out = normalizeCv({ summary: 'hi', _custom: 123 });
    expect(out._custom).toBe(123);
  });
});
