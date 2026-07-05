// Document theme presets — bundles of style tokens (accent color, font family,
// and the typography numbers) applied as a set. Selecting a theme overwrites
// state.data.style with the theme's tokens; tweaking any slider afterwards
// clears the active theme id (custom). No Vue / Electron imports, so this can
// be unit-tested in isolation. THEMES[0] (modern) doubles as the default style.
export const THEMES = [
  {
    id: 'modern',
    name: 'Modern Blue',
    nameKo: '모던 블루',
    tokens: { accent: '#2f6feb', font: 'sans', nameSize: 28, headingSize: 13.5, bodySize: 12, lineHeight: 1.5, ruleWidth: 1.5 }
  },
  {
    id: 'classic',
    name: 'Classic Mono',
    nameKo: '클래식 모노',
    tokens: { accent: '#333333', font: 'sans', nameSize: 27, headingSize: 13, bodySize: 12, lineHeight: 1.45, ruleWidth: 1 }
  },
  {
    id: 'academic',
    name: 'Academic Serif',
    nameKo: '학술 세리프',
    tokens: { accent: '#1f1f1f', font: 'serif', nameSize: 26, headingSize: 13, bodySize: 12, lineHeight: 1.5, ruleWidth: 1 }
  },
  {
    id: 'deepgreen',
    name: 'Deep Green',
    nameKo: '딥 그린',
    tokens: { accent: '#0f6e56', font: 'sans', nameSize: 28, headingSize: 13.5, bodySize: 12, lineHeight: 1.5, ruleWidth: 1.5 }
  },
  {
    id: 'burgundy',
    name: 'Burgundy Serif',
    nameKo: '버건디 세리프',
    tokens: { accent: '#7a2743', font: 'serif', nameSize: 27, headingSize: 13, bodySize: 12, lineHeight: 1.5, ruleWidth: 1 }
  }
];

// Look up a theme by id, falling back to the first preset (modern) when the id
// is unknown or missing.
export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
