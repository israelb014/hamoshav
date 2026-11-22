// Usage: node scripts/shot.mjs <url> <out.png> [width] [height] [fullPage]
import { chromium } from 'playwright-core';
const [url, out, w = '1400', h = '900', full = '1'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
p.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: full === '1' });
await b.close();
