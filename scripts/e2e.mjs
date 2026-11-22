// End-to-end smoke test in real Chrome: plant -> water -> speed up -> harvest -> feed -> sell -> reload.
// Usage: node scripts/e2e.mjs <baseUrl> <outDir> [width] [height]
import { chromium } from 'playwright-core';

const [base = 'http://localhost:5173/hamoshav/', out = '.', W = '390', H = '844'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 2, hasTouch: false });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const tag = `${W}x${H}`;
const shot = (n) => p.screenshot({ path: `${out}/e2e-${tag}-${n}.png` });
const state = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__hamoshav.store.s)));
const pos = (id) => p.evaluate((id) => window.__hamoshav.scene.screenPos(id, false), id);
const assert = (c, msg) => { if (!c) { console.log('FAIL:', msg); process.exitCode = 1; } else console.log('ok:', msg); };
const wait = (ms) => p.waitForTimeout(ms);
// click by coordinates (the UI re-renders every second, so element handles can go stale)
const tap = async (sel) => {
  for (let i = 0; i < 10; i++) {
    await p.waitForSelector(sel, { state: 'visible', timeout: 5000 });
    const bb = await p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.x, y: r.y, width: r.width, height: r.height } : null; }, sel);
    if (bb) return p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await p.waitForTimeout(100);
  }
  throw new Error('cannot tap ' + sel);
};

await p.goto(base);
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForFunction(() => window.__hamoshav && document.getElementById('loading') === null, null, { timeout: 20000 });
await wait(600);
await shot('01-start');

let s = await state();
const plot = s.entities.find((e) => e.kind === 'plot');
// make sure no rain interferes with the watering step
await p.evaluate(() => { const st = window.__hamoshav.store.s; st.weather.type = 'sun'; for (const e of st.entities) if (e.kind === 'plot') e.plot.water = 0; });

// 1. plant
let xy = await pos(plot.id);
await p.mouse.click(xy.x, xy.y);
await wait(400);
assert(await p.isVisible('.sheet .cropcard'), 'plant sheet opens on empty plot');
await shot('02-plant-sheet');
await tap('.cropcard[data-v="wheat"]');
await wait(400);
s = await state();
assert(s.entities.find((e) => e.id === plot.id).plot.crop === 'wheat', 'wheat planted');
assert(s.coins === 295, 'seed cost deducted (300 -> 295)');

// 2. water
await p.mouse.click(xy.x, xy.y);
await wait(400);
s = await state();
assert(s.entities.find((e) => e.id === plot.id).plot.water > 0, 'plot watered');

// 3. growth popover + speed-up
await p.mouse.click(xy.x, xy.y);
await wait(400);
assert(await p.isVisible('.pop'), 'growth popover visible');
await shot('03-grow-pop');
await tap('.pop [data-a="speed"]');
await wait(500);
s = await state();
assert(s.diamonds === 4, 'speed-up cost 1 diamond');

// 4. harvest
await p.mouse.click(xy.x, xy.y);
await wait(300);
await shot('04-harvest-fly');
await wait(900);
s = await state();
assert(s.storage.items.wheat === 4, 'harvested wheat into storage (3 + 1)');
assert(s.xp === 1, 'xp gained');

// 5. feed chickens via coop sheet
const coop = s.entities.find((e) => e.kind === 'structure' && e.type === 'coop');
xy = await pos(coop.id);
await p.mouse.click(xy.x, xy.y - 10);
await wait(400);
let ok = await p.isVisible('.sheet [data-a="feedall"]');
if (!ok) {
  // may have tapped a chicken -> animal sheet; use feed button there
  ok = await p.isVisible('.sheet [data-a="feed"]');
  await tap('.sheet [data-a="feed"]');
} else {
  await shot('05-coop');
  await tap('.sheet [data-a="feedall"]');
}
await wait(400);
s = await state();
assert(ok, 'coop / animal sheet opened');
assert((s.storage.items.wheat ?? 0) < 4, 'feeding consumed wheat');
// open an animal detail
if (await p.$('.sheet [data-a="animal"]')) {
  await tap('.sheet [data-a="animal"]');
  await wait(400);
  assert(await p.isVisible('.stats3'), 'animal detail with rings');
  await shot('06-animal');
}
await tap('.sheet-head [data-a="close-sheet"]');
await wait(300);

// 6. sell at the market
await tap('#nav-market');
await wait(400);
await shot('07-market');
const before = (await state()).coins;
await tap('.stall [data-a="sell"]');
await wait(1200);
s = await state();
assert(s.coins > before, `sold at market (${before} -> ${s.coins})`);
assert(s.tutorial.done, 'tutorial completed by the 5 actions');

// 7. other screens
for (const n of ['shop', 'storage', 'tasks']) {
  await tap(`#nav-${n}`);
  await wait(350);
  await shot(`08-${n}`);
}

await tap('#nav-shop');
await wait(300);
await tap('.tabs [data-v="trees"]');
await wait(250);
await shot('09-shop-trees');
await tap('.sheet-head [data-a="close-sheet"]');
await wait(300);
await tap('[data-a="settings"]');
await wait(350);
await shot('10-settings');
await tap('.sheet-head [data-a="close-sheet"]');
await wait(300);

// 8. persistence across reload
const coinsBefore = (await state()).coins;
await p.evaluate(() => window.__hamoshav.store.save());
await p.reload();
await p.waitForFunction(() => window.__hamoshav && document.getElementById('loading') === null, null, { timeout: 20000 });
s = await state();
assert(s.coins === coinsBefore, `save survives reload (coins ${s.coins})`);

// 9. away summary: pretend we left 9 hours ago
await p.evaluate(() => {
  window.__hamoshav.store.saveEnabled = false; // keep pagehide from overwriting the doctored save
  const st = JSON.parse(JSON.stringify(window.__hamoshav.store.s));
  const shift = 9 * 3600 * 1000;
  st.lastTick -= shift;
  st.savedAt -= shift;
  localStorage.setItem('hamoshav.save', JSON.stringify(st));
});
await p.reload();
await p.waitForFunction(() => window.__hamoshav && document.getElementById('loading') === null, null, { timeout: 20000 });
await wait(500);
assert(await p.isVisible('.modal .evlist'), 'away modal shown after 9h');
await shot('11-away');
await tap('.modal [data-a="close-modal"].btn');
await wait(300);

// 10. RTL + no horizontal overflow
const dir = await p.evaluate(() => document.documentElement.dir);
assert(dir === 'rtl', 'document is RTL');
const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
assert(!overflow, 'no horizontal overflow');

// 11. edit mode toggle
await tap('[data-a="edit"]');
await wait(300);
assert(await p.isVisible('.editbar'), 'edit mode bar');
await shot('12-edit');
await tap('.editbar [data-a="edit"]');

console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
if (errors.length) process.exitCode = 1;
await b.close();
