import { describe, it, expect } from 'vitest';
import { normalizeOrder } from '../src/lib/order.js';
import { MAIN_SECTION_KEYS } from '../src/schema.js';

describe('normalizeOrder (section order normalization)', () => {
  const KEYS = ['a', 'b', 'c'];

  it('keeps a valid saved order as-is', () => {
    expect(normalizeOrder(['b', 'a', 'c'], KEYS)).toEqual(['b', 'a', 'c']);
  });

  it('appends keys missing from the saved order (in canonical order)', () => {
    expect(normalizeOrder(['b', 'a'], KEYS)).toEqual(['b', 'a', 'c']);
  });

  it('drops unknown keys from the saved order', () => {
    expect(normalizeOrder(['x', 'a', 'zzz'], KEYS)).toEqual(['a', 'b', 'c']);
  });

  it('falls back to the canonical order for empty / non-array input', () => {
    expect(normalizeOrder([], KEYS)).toEqual(['a', 'b', 'c']);
    expect(normalizeOrder(undefined, KEYS)).toEqual(['a', 'b', 'c']);
    expect(normalizeOrder(null, KEYS)).toEqual(['a', 'b', 'c']);
    expect(normalizeOrder('nope', KEYS)).toEqual(['a', 'b', 'c']);
  });

  it('combines reordering, dropping, and appending', () => {
    // saved order reverses b/a, includes an unknown, and omits c
    expect(normalizeOrder(['b', 'unknown', 'a'], KEYS)).toEqual(['b', 'a', 'c']);
  });

  describe('against the real MAIN_SECTION_KEYS', () => {
    it('returns every canonical key exactly once for any input', () => {
      const out = normalizeOrder(['patents', 'bogus'], MAIN_SECTION_KEYS);
      expect([...out].sort()).toEqual([...MAIN_SECTION_KEYS].sort());
      expect(out[0]).toBe('patents'); // honored saved position
    });

    it('returns the canonical order when nothing is saved', () => {
      expect(normalizeOrder(undefined, MAIN_SECTION_KEYS)).toEqual(MAIN_SECTION_KEYS);
    });
  });
});
