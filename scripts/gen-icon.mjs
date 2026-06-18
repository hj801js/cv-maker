// Rasterize build/icon.svg into the app icons electron-builder + the window use.
// Run with: npm run gen-icon  (requires devDeps: sharp, png-to-ico)
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build');
mkdirSync(buildDir, { recursive: true });

const svg = readFileSync(path.join(buildDir, 'icon.svg'));
const sizes = [16, 24, 32, 48, 64, 128, 256];

// High density so the vector is crisp when downscaled to each size.
const pngBuffers = await Promise.all(
  sizes.map((s) => sharp(svg, { density: 512 }).resize(s, s).png().toBuffer())
);

// 256px PNG for the BrowserWindow / non-Windows window icon.
writeFileSync(path.join(buildDir, 'icon.png'), pngBuffers[sizes.indexOf(256)]);

// Multi-resolution .ico for the Windows exe + installer (electron-builder).
const ico = await pngToIco(pngBuffers);
writeFileSync(path.join(buildDir, 'icon.ico'), ico);

console.log(`Generated build/icon.ico (${sizes.join(', ')}) and build/icon.png`);
