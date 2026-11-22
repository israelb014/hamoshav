// Renders app icons + splash screens from the game's SVG sprites using headless Chrome.
// Requires the dev server running: npm run dev  (default http://localhost:5173/hamoshav/)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:5173/hamoshav/';
const res = 'android/app/src/main/res';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const page = await b.newPage();
async function render(params, out, w, h) {
  await page.setViewportSize({ width: Math.max(w, 800), height: Math.max(h, 800) });
  await page.goto(`${base}icon-gen.html?${params}`);
  await page.waitForSelector('body[data-ready="1"]');
  mkdirSync(out.substring(0, out.lastIndexOf('/')), { recursive: true });
  await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('wrote', out);
}
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(dens)) {
  const s = Math.round(48 * k), f = Math.round(108 * k);
  await render(`mode=icon&size=${s}`, `${res}/mipmap-${d}/ic_launcher.png`, s, s);
  await render(`mode=round&size=${s}`, `${res}/mipmap-${d}/ic_launcher_round.png`, s, s);
  await render(`mode=fg&size=${f}`, `${res}/mipmap-${d}/ic_launcher_foreground.png`, f, f);
  const pw = Math.round(320 * k), ph = Math.round(480 * k);
  await render(`mode=splash&w=${pw}&h=${ph}`, `${res}/drawable-port-${d}/splash.png`, pw, ph);
  await render(`mode=splash&w=${ph}&h=${pw}`, `${res}/drawable-land-${d}/splash.png`, ph, pw);
}
await render('mode=splash&w=480&h=800', `${res}/drawable/splash.png`, 480, 800);
await render('mode=icon&size=192', 'public/icon-192.png', 192, 192);
await render('mode=icon&size=512', 'public/icon-512.png', 512, 512);
await b.close();
