import {
  ANIMALS,
  CROPS,
  DECOS,
  HOUR,
  LAND_STAGES,
  MIN,
  STORAGE_STEP,
  STRUCTURES,
  TREAT_COST,
  TREES,
  WATER_MS,
  plotPrice,
  storageUpgradePrice,
  type AnimalId,
  type CropId,
  type DecoKind,
  type ItemId,
  type StructureKind,
  type TreeId,
} from './data';
import { xpToNext } from './level';
import { applySaleToMarket, quoteSale } from './market';
import { seasonOf } from './season';
import { progressTask } from './tasks';
import {
  emptyPlot,
  entitySize,
  findEntity,
  findFreeSpot,
  isFree,
  newAnimal,
  storageUsed,
  type Animal,
  type GameState,
  type Plot,
  type StructureEntity,
} from './state';

export type Result = { ok: true; msg?: string; [k: string]: unknown } | { ok: false; msg: string };
const fail = (msg: string): Result => ({ ok: false, msg });

export function addXp(s: GameState, n: number): void {
  s.xp += n;
  while (s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
    s.diamonds += 2;
    s.pendingLevelUps.push(s.level);
  }
}

export function addItem(s: GameState, id: ItemId, n: number): boolean {
  if (storageUsed(s) + n > s.storage.cap) return false;
  s.storage.items[id] = (s.storage.items[id] ?? 0) + n;
  return true;
}

function takeItem(s: GameState, id: ItemId, n: number): boolean {
  if ((s.storage.items[id] ?? 0) < n) return false;
  s.storage.items[id] = (s.storage.items[id] ?? 0) - n;
  if (s.storage.items[id] === 0) delete s.storage.items[id];
  return true;
}

const STORAGE_FULL = 'המחסן מלא – מכור בשוק או שדרג את המחסן';

/** Resolve a plot by entity id and optional greenhouse slot. */
export function getPlot(s: GameState, entityId: number, slot?: number): { plot: Plot; greenhouse: boolean } | null {
  const e = findEntity(s, entityId);
  if (!e) return null;
  if (e.kind === 'plot') return { plot: e.plot, greenhouse: false };
  if (e.kind === 'structure' && e.plots && slot !== undefined && e.plots[slot]) return { plot: e.plots[slot], greenhouse: true };
  return null;
}

export function canPlant(s: GameState, crop: CropId, now: number, greenhouse: boolean): string | null {
  const def = CROPS[crop];
  if (s.level < def.level) return `נפתח ברמה ${def.level}`;
  if (!greenhouse && !def.seasons.includes(seasonOf(now))) return 'לא בעונה';
  if (s.coins < def.seed) return 'אין מספיק מטבעות';
  return null;
}

export function plant(s: GameState, entityId: number, crop: CropId, now: number, slot?: number): Result {
  const r = getPlot(s, entityId, slot);
  if (!r) return fail('חלקה לא נמצאה');
  if (r.plot.crop) return fail('החלקה תפוסה');
  const why = canPlant(s, crop, now, r.greenhouse);
  if (why) return fail(why);
  s.coins -= CROPS[crop].seed;
  Object.assign(r.plot, { crop, grow: 0, ripeFor: 0, withered: false });
  progressTask(s, 'plant', 1);
  return { ok: true };
}

export function water(s: GameState, entityId: number): Result {
  const r = getPlot(s, entityId);
  if (!r) return fail('חלקה לא נמצאה');
  r.plot.water = WATER_MS;
  return { ok: true };
}

export function isRipe(p: Plot): boolean {
  return !!p.crop && !p.withered && p.grow >= CROPS[p.crop].growMs;
}

export function harvest(s: GameState, entityId: number, slot?: number): Result {
  const r = getPlot(s, entityId, slot);
  if (!r || !isRipe(r.plot)) return fail('אין מה לקטוף');
  const crop = r.plot.crop!;
  if (!addItem(s, crop, 1)) return fail(STORAGE_FULL);
  const def = CROPS[crop];
  Object.assign(r.plot, { crop: null, grow: 0, ripeFor: 0, withered: false });
  addXp(s, def.xp);
  s.stats.harvested++;
  progressTask(s, 'harvest', 1, crop);
  return { ok: true, item: crop, xp: def.xp };
}

export function clearPlot(s: GameState, entityId: number, slot?: number): Result {
  const r = getPlot(s, entityId, slot);
  if (!r || !r.plot.withered) return fail('אין מה לנקות');
  Object.assign(r.plot, { crop: null, grow: 0, ripeFor: 0, withered: false });
  return { ok: true };
}

/** Tractor: harvest every ripe plot (fields + greenhouses). */
export function harvestAll(s: GameState): Result {
  let count = 0;
  let xp = 0;
  for (const e of s.entities) {
    const plots: [number, number | undefined][] =
      e.kind === 'plot' ? [[e.id, undefined]] : e.kind === 'structure' && e.plots ? e.plots.map((_, i) => [e.id, i]) : [];
    for (const [id, slot] of plots) {
      const r = getPlot(s, id, slot)!;
      if (!isRipe(r.plot)) continue;
      const res = harvest(s, id, slot);
      if (!res.ok) return count ? { ok: true, count, xp, msg: res.msg } : res;
      count++;
      xp += res.xp as number;
    }
  }
  if (!count) return fail('אין חלקות בשלות');
  return { ok: true, count, xp };
}

// ---- Speed-up with diamonds ----
export function speedUpCost(remainingMs: number): number {
  return Math.max(1, Math.ceil(remainingMs / (30 * MIN)));
}

export function plotRemaining(p: Plot): number {
  if (!p.crop || p.withered) return 0;
  return Math.max(0, CROPS[p.crop].growMs - p.grow);
}

export function speedUpPlot(s: GameState, entityId: number, slot?: number): Result {
  const r = getPlot(s, entityId, slot);
  if (!r) return fail('חלקה לא נמצאה');
  const rem = plotRemaining(r.plot);
  if (rem <= 0) return fail('אין מה להאיץ');
  const cost = speedUpCost(rem);
  if (s.diamonds < cost) return fail('אין מספיק יהלומים');
  s.diamonds -= cost;
  r.plot.grow = CROPS[r.plot.crop!].growMs;
  r.plot.ripeFor = 0;
  return { ok: true, cost };
}

export function animalRemaining(a: Animal): number {
  if (a.ready) return 0;
  return Math.max(0, ANIMALS[a.type].productMs - a.prod);
}

function findAnimal(s: GameState, animalId: number): { a: Animal; b: StructureEntity } | null {
  for (const e of s.entities)
    if (e.kind === 'structure' && e.animals) {
      const a = e.animals.find((x) => x.id === animalId);
      if (a) return { a, b: e };
    }
  return null;
}

export function speedUpAnimal(s: GameState, animalId: number): Result {
  const f = findAnimal(s, animalId);
  if (!f) return fail('החיה לא נמצאה');
  if (f.a.age < 3 * 24 * HOUR) return fail('עדיין צעירה מדי');
  const rem = animalRemaining(f.a);
  if (rem <= 0) return fail('אין מה להאיץ');
  const cost = speedUpCost(rem);
  if (s.diamonds < cost) return fail('אין מספיק יהלומים');
  s.diamonds -= cost;
  f.a.prod = 0;
  f.a.ready = true;
  return { ok: true, cost };
}

// ---- Animals ----
export function feed(s: GameState, animalId: number): Result {
  const f = findAnimal(s, animalId);
  if (!f) return fail('החיה לא נמצאה');
  if (f.a.hunger >= 95) return fail(`${f.a.name} שבעה`);
  const food = ANIMALS[f.a.type].food.find((c) => (s.storage.items[c] ?? 0) > 0);
  if (!food) return fail(`צריך ${ANIMALS[f.a.type].food.map((c) => CROPS[c].name).join(' או ')} במחסן`);
  takeItem(s, food, 1);
  f.a.hunger = 100;
  f.a.starveMs = 0;
  progressTask(s, 'feed', 1);
  return { ok: true, food };
}

export function collect(s: GameState, animalId: number): Result {
  const f = findAnimal(s, animalId);
  if (!f || !f.a.ready) return fail('אין תוצרת לאסוף');
  const def = ANIMALS[f.a.type];
  if (!addItem(s, def.product, 1)) return fail(STORAGE_FULL);
  f.a.ready = false;
  addXp(s, def.xp);
  progressTask(s, 'collect', 1, def.product);
  return { ok: true, item: def.product, xp: def.xp };
}

export function treat(s: GameState, animalId: number): Result {
  const f = findAnimal(s, animalId);
  if (!f) return fail('החיה לא נמצאה');
  if (!f.a.sick) return fail(`${f.a.name} בריאה`);
  if (s.coins < TREAT_COST) return fail('אין מספיק מטבעות');
  s.coins -= TREAT_COST;
  f.a.sick = false;
  f.a.starveMs = 0;
  f.a.health = Math.max(f.a.health, 80);
  return { ok: true };
}

export function pet(s: GameState, animalId: number, now: number): Result {
  const f = findAnimal(s, animalId);
  if (!f) return fail('החיה לא נמצאה');
  if (now - f.a.lastPet < HOUR) return fail('אפשר ללטף פעם בשעה');
  f.a.lastPet = now;
  f.a.happiness = Math.min(100, f.a.happiness + 10);
  return { ok: true };
}

export function rename(s: GameState, animalId: number, name: string): Result {
  const f = findAnimal(s, animalId);
  const clean = name.trim().slice(0, 16);
  if (!f || !clean) return fail('שם לא תקין');
  f.a.name = clean;
  return { ok: true };
}

export function feedAll(s: GameState, buildingId: number): Result {
  const b = findEntity(s, buildingId);
  if (!b || b.kind !== 'structure' || !b.animals) return fail('מבנה לא נמצא');
  let n = 0;
  let last: Result | null = null;
  for (const a of b.animals) {
    if (a.hunger >= 95) continue;
    last = feed(s, a.id);
    if (last.ok) n++;
    else break;
  }
  if (!n) return last && !last.ok ? last : fail('כולן שבעות');
  return { ok: true, count: n };
}

export function collectAll(s: GameState, buildingId: number): Result {
  const b = findEntity(s, buildingId);
  if (!b || b.kind !== 'structure' || !b.animals) return fail('מבנה לא נמצא');
  let n = 0;
  let xp = 0;
  for (const a of b.animals) {
    if (!a.ready) continue;
    const r = collect(s, a.id);
    if (!r.ok) return n ? { ok: true, count: n, xp, msg: r.msg } : r;
    n++;
    xp += r.xp as number;
  }
  if (!n) return fail('אין תוצרת לאסוף');
  return { ok: true, count: n, xp, item: ANIMALS[b.animals[0].type].product };
}

// ---- Trees ----
export function harvestTree(s: GameState, entityId: number): Result {
  const e = findEntity(s, entityId);
  if (!e || e.kind !== 'tree' || !e.hasFruit) return fail('אין פרי לקטוף');
  if (!addItem(s, e.type, 1)) return fail(STORAGE_FULL);
  e.hasFruit = false;
  e.fruit = 0;
  const def = TREES[e.type];
  addXp(s, def.xp);
  progressTask(s, 'harvest', 1, e.type);
  return { ok: true, item: e.type, xp: def.xp };
}

export function treeRemaining(s: GameState, entityId: number): number {
  const e = findEntity(s, entityId);
  if (!e || e.kind !== 'tree') return 0;
  const def = TREES[e.type];
  if (e.age < def.matureMs) return def.matureMs - e.age;
  if (e.hasFruit) return 0;
  return def.fruitMs - e.fruit;
}

export function speedUpTree(s: GameState, entityId: number, now: number): Result {
  const e = findEntity(s, entityId);
  if (!e || e.kind !== 'tree') return fail('עץ לא נמצא');
  const def = TREES[e.type];
  if (e.age >= def.matureMs && !def.seasons.includes(seasonOf(now))) return fail('לא בעונת הפרי');
  const rem = treeRemaining(s, entityId);
  if (rem <= 0) return fail('אין מה להאיץ');
  const cost = speedUpCost(rem);
  if (s.diamonds < cost) return fail('אין מספיק יהלומים');
  s.diamonds -= cost;
  if (e.age < def.matureMs) e.age = def.matureMs;
  else {
    e.fruit = 0;
    e.hasFruit = true;
  }
  return { ok: true, cost };
}

// ---- Market ----
export function sell(s: GameState, id: ItemId, qty: number, now: number): Result {
  const have = s.storage.items[id] ?? 0;
  if (qty <= 0 || qty > have) return fail('אין מספיק במחסן');
  const total = quoteSale(s, id, qty, now);
  takeItem(s, id, qty);
  applySaleToMarket(s, id, qty);
  s.coins += total;
  s.stats.sold += total;
  progressTask(s, 'sell', total);
  return { ok: true, coins: total };
}

// ---- Shop ----
function place(s: GameState, size: number): { x: number; y: number } | null {
  return findFreeSpot(s, size);
}
const NO_ROOM = 'אין מקום פנוי – הרחב את האדמה או הזז דברים במצב עריכה';

export function plotCount(s: GameState): number {
  return s.entities.filter((e) => e.kind === 'plot').length;
}

export function buyPlot(s: GameState): Result {
  const price = plotPrice(plotCount(s));
  if (s.coins < price) return fail('אין מספיק מטבעות');
  const p = place(s, 1);
  if (!p) return fail(NO_ROOM);
  s.coins -= price;
  const id = s.nextId++;
  s.entities.push({ id, kind: 'plot', x: p.x, y: p.y, plot: emptyPlot() });
  return { ok: true, id };
}

export function buyStructure(s: GameState, kind: StructureKind): Result {
  const def = STRUCTURES[kind];
  if (!def.buyable) return fail('לא למכירה');
  if (s.level < def.level) return fail(`נפתח ברמה ${def.level}`);
  if (s.coins < def.price) return fail('אין מספיק מטבעות');
  const p = place(s, def.size);
  if (!p) return fail(NO_ROOM);
  s.coins -= def.price;
  const e: StructureEntity = { id: s.nextId++, kind: 'structure', type: kind, x: p.x, y: p.y };
  if (def.capacity) e.animals = [];
  if (kind === 'greenhouse') e.plots = [emptyPlot(), emptyPlot(), emptyPlot(), emptyPlot()];
  s.entities.push(e);
  return { ok: true, id: e.id };
}

export function buyAnimal(s: GameState, type: AnimalId, now: number): Result {
  const def = ANIMALS[type];
  if (s.level < def.level) return fail(`נפתח ברמה ${def.level}`);
  if (s.coins < def.price) return fail('אין מספיק מטבעות');
  const home = s.entities.find(
    (e): e is StructureEntity =>
      e.kind === 'structure' && def.building.includes(e.type as never) && (e.animals?.length ?? 0) < (STRUCTURES[e.type].capacity ?? 0),
  );
  if (!home) {
    const names = def.building.map((b) => STRUCTURES[b].name).join(' או ');
    return fail(`צריך ${names} עם מקום פנוי`);
  }
  s.coins -= def.price;
  const a = newAnimal(s, type, now, true);
  home.animals!.push(a);
  return { ok: true, id: a.id, building: home.id };
}

export function buyTree(s: GameState, type: TreeId): Result {
  const def = TREES[type];
  if (s.level < def.level) return fail(`נפתח ברמה ${def.level}`);
  if (s.coins < def.price) return fail('אין מספיק מטבעות');
  const p = place(s, 1);
  if (!p) return fail(NO_ROOM);
  s.coins -= def.price;
  const id = s.nextId++;
  s.entities.push({ id, kind: 'tree', type, x: p.x, y: p.y, age: 0, fruit: 0, hasFruit: false });
  return { ok: true, id };
}

export function buyDeco(s: GameState, type: DecoKind): Result {
  const def = DECOS[type];
  if (s.level < def.level) return fail(`נפתח ברמה ${def.level}`);
  if (s.coins < def.price) return fail('אין מספיק מטבעות');
  const p = place(s, 1);
  if (!p) return fail(NO_ROOM);
  s.coins -= def.price;
  const id = s.nextId++;
  s.entities.push({ id, kind: 'deco', type, x: p.x, y: p.y });
  return { ok: true, id };
}

export function expandLand(s: GameState): Result {
  const next = LAND_STAGES[s.landStage + 1];
  if (!next) return fail('האדמה כבר בגודל המלא');
  if (s.level < next.level) return fail(`נפתח ברמה ${next.level}`);
  if (s.coins < next.price) return fail('אין מספיק מטבעות');
  s.coins -= next.price;
  s.landStage++;
  return { ok: true };
}

export function upgradeStorage(s: GameState): Result {
  const price = storageUpgradePrice(s.storage.upgrades);
  if (s.coins < price) return fail('אין מספיק מטבעות');
  s.coins -= price;
  s.storage.upgrades++;
  s.storage.cap += STORAGE_STEP;
  return { ok: true };
}

export function moveEntity(s: GameState, entityId: number, x: number, y: number): Result {
  const e = findEntity(s, entityId);
  if (!e) return fail('לא נמצא');
  if (!isFree(s, x, y, entitySize(e), e.id)) return fail('אי אפשר להציב כאן');
  e.x = x;
  e.y = y;
  return { ok: true };
}

export function claimTask(s: GameState, taskId: number): Result {
  const t = s.tasks.list.find((x) => x.id === taskId);
  if (!t || t.claimed || t.progress < t.n) return fail('המשימה עוד לא הושלמה');
  t.claimed = true;
  s.coins += t.coins;
  s.diamonds += t.diamonds;
  addXp(s, t.xp);
  return { ok: true };
}
