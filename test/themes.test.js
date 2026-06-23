import { describe, it, expect } from 'vitest';
import { THEMES, getTheme } from '../src/lib/themes.js';

const TOKEN_KEYS = ['nameSize', 'headingSize', 'bodySize', 'lineHeight', 'ruleWidth', 'accent', 'font'];

describe('themes (document theme presets)', () => {
  it('exposes exactly the three documented presets', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['modern', 'classic', 'academic']);
  });

  it('looks up a theme by id', () => {
    expect(getTheme('classic').id).toBe('classic');
    expect(getTheme('academic').id).toBe('academic');
  });

  it('falls back to the first preset (modern) for an unknown id', () => {
    expect(getTheme('does-not-exist')).toBe(THEMES[0]);
    expect(getTheme('does-not-exist').id).toBe('modern');
  });

  it('gives every theme all seven style tokens', () => {
    for (const theme of THEMES) {
      expect(Object.keys(theme.tokens).sort()).toEqual([...TOKEN_KEYS].sort());
    }
  });

  it('matches the documented modern defaults', () => {
    expect(getTheme('modern').tokens).toEqual({
      accent: '#2f6feb',
      font: 'sans',
      nameSize: 28,
      headingSize: 13.5,
      bodySize: 12,
      lineHeight: 1.5,
      ruleWidth: 1.5
    });
  });
});
