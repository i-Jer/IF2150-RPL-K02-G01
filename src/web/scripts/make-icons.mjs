// Renders the SeaGuard shield logo (docs/M7/assets/logo-seaguard.svg) into Android launcher icons,
// adaptive-icon foregrounds, splash screens and web icons. Source: public/logo.svg.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const web = resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '..');
const res = join(web, 'android/app/src/main/res');
const logo = readFileSync(join(web, 'public/logo.svg'));
const NAVY = '#0b3c5d';
const BOARD = '#0f2a3c';

const logoPng = (size) => sharp(logo, { density: 600 }).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

/** Square icon: logo on a light ground so the navy shield reads on any launcher. */
async function icon(size, round = false) {
  const inner = Math.round(size * 0.72);
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${round
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#e6ebec"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#e6ebec"/>`}</svg>`);
  return sharp(bg).composite([{ input: await logoPng(inner), gravity: 'center' }]).png().toBuffer();
}

/** Adaptive icon foreground: logo inside the 66% safe zone of a 108dp canvas, transparent. */
async function foreground(size) {
  const inner = Math.round(size * 0.56);
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await logoPng(inner), gravity: 'center' }]).png().toBuffer();
}

async function splash(w, h) {
  const inner = Math.round(Math.min(w, h) * 0.28);
  return sharp({ create: { width: w, height: h, channels: 4, background: BOARD } })
    .composite([{ input: await logoPng(inner), gravity: 'center' }]).png().toBuffer();
}

const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(DENS)) {
  const dir = join(res, `mipmap-${d}`);
  if (!existsSync(dir)) continue;
  writeFileSync(join(dir, 'ic_launcher.png'), await icon(Math.round(48 * k)));
  writeFileSync(join(dir, 'ic_launcher_round.png'), await icon(Math.round(48 * k), true));
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), await foreground(Math.round(108 * k)));
}
// Adaptive icon background colour
const bgXml = join(res, 'values/ic_launcher_background.xml');
writeFileSync(bgXml, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#E6EBEC</color>\n</resources>\n`);

// Splash screens in every drawable folder that has one
for (const dir of readdirSync(res).filter((f) => f.startsWith('drawable'))) {
  const f = join(res, dir, 'splash.png');
  if (!existsSync(f)) continue;
  const meta = await sharp(f).metadata();
  writeFileSync(f, await splash(meta.width, meta.height));
}

// Web icons
writeFileSync(join(web, 'public/icon-192.png'), await icon(192));
writeFileSync(join(web, 'public/icon-512.png'), await icon(512));
console.log('[icons] launcher, adaptive, splash and web icons written', NAVY);
