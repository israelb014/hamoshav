import { describe, expect, it } from 'vitest';
import { CROPS, DAY, HOUR, MIN, WATER_MS } from '../src/sim/data';
import { createInitialState, migrate, SAVE_VERSION, allAnimals, type GameState, type PlotEntity, type StructureEntity } from '../src/sim/state';
import { advance as realAdvance, emptyEvents } from '../src/sim/sim';
// Most tests keep the weather fixed (set manually) so random rain does not interfere.
const advance = (s: GameState, t: number) => realAdvance(s, t, emptyEvents(), { fixedWeather: true });
import * as A from '../src/sim/actions';
import { seasonOf, isFriday } from '../src/sim/season';
import { xpToNext } from '../src/sim/level';
import { quoteSale, unitPrice } from '../src/sim/market';

// Thursday 2026-11-19 10:00 local – autumn, not Friday.
const T0 = new Date(2026, 10, 19, 10, 0, 0).getTime();

function fresh(seed = 42, now = T0): GameState {
  const s = createInitialState(now, seed);
  s.weather = { slot: Math.floor(now / (6 * HOUR)), type: 'sun', temp: 24 };
  return s;
}
const plots = (s: GameState) => s.entities.filter((e): e is PlotEntity => e.kind === 'plot');
const coop = (s: GameState) => s.entities.find((e): e is StructureEntity => e.kind === 'structure' && e.type === 'coop')!;

describe('crop growth', () => {
  it('grows by elapsed time when watered and ripens', () => {
    const s = fresh();
    const p = plots(s)[0];
    expect(A.plant(s, p.id, 'tomato', T0).ok).toBe(true);
    A.water(s, p.id);
    advance(s, T0 + 15 * MIN);
    expect(p.plot.grow).toBe(15 * MIN);
    expect(A.isRipe(p.plot)).toBe(false);
    advance(s, T0 + 31 * MIN);
    expect(A.isRipe(p.plot)).toBe(true);
    const r = A.harvest(s, p.id);
    expect(r.ok).toBe(true);
    expect(s.storage.items.tomato).toBe(1);
  });

  it('a dry plot does not grow; water lasts 6 hours', () => {
    const s = fresh();
    s.level = 6;
    const p = plots(s)[0];
    A.plant(s, p.id, 'cauliflower', T0);
    advance(s, T0 + HOUR);
    expect(p.plot.grow).toBe(0);
    A.water(s, p.id);
    advance(s, T0 + 9 * HOUR);
    expect(p.plot.water).toBe(0);
    expect(p.plot.grow).toBe(WATER_MS); // 6h of growth, then dry -> stops
    expect(A.isRipe(p.plot)).toBe(true); // cauliflower = 6h
  });

  it('heatwave dries twice as fast, rain waters', () => {
    const s = fresh();
    s.level = 6;
    const p = plots(s)[0];
    A.plant(s, p.id, 'cauliflower', T0);
    A.water(s, p.id);
    s.weather.type = 'heat';
    advance(s, T0 + 2 * HOUR);
    expect(p.plot.water).toBe(WATER_MS - 4 * HOUR);
    s.weather.type = 'rain';
    advance(s, T0 + 3 * HOUR);
    expect(p.plot.water).toBe(WATER_MS - 10 * MIN); // refilled every step while raining, minus the last step
  });

  it('ripe crop withers after 24 hours and can be cleared', () => {
    const s = fresh();
    const p = plots(s)[0];
    A.plant(s, p.id, 'wheat', T0);
    A.water(s, p.id);
    advance(s, T0 + 2 * MIN + 23 * HOUR);
    expect(p.plot.withered).toBe(false);
    advance(s, T0 + 2 * MIN + 24 * HOUR + MIN);
    expect(p.plot.withered).toBe(true);
    expect(A.harvest(s, p.id).ok).toBe(false);
    expect(A.clearPlot(s, p.id).ok).toBe(true);
    expect(p.plot.crop).toBeNull();
  });

  it('out-of-season crops cannot be planted (except greenhouse)', () => {
    const s = fresh();
    s.level = 10;
    s.coins = 10000;
    expect(A.canPlant(s, 'watermelon', T0, false)).toBe('לא בעונה');
    expect(A.canPlant(s, 'watermelon', T0, true)).toBeNull();
  });
});

describe('offline simulation', () => {
  function scenario(): GameState {
    const s = fresh(1234);
    const ps = plots(s);
    A.plant(s, ps[0].id, 'tomato', T0);
    A.water(s, ps[0].id);
    A.plant(s, ps[1].id, 'wheat', T0);
    realAdvance(s, T0 + 9 * HOUR);
    return s;
  }
  it('9 hours away is deterministic with a fixed seed', () => {
    const a = scenario();
    const b = scenario();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = coop(a);
    // chickens: hunger 60 - 36 = 24, each laid one egg (4h) and waits for collection
    for (const ch of c.animals!) {
      expect(ch.hunger).toBeCloseTo(24, 5);
      expect(ch.ready).toBe(true);
    }
    expect(A.isRipe(plots(a)[0].plot)).toBe(true);
    expect(a.lastTick).toBe(T0 + 9 * HOUR);
  });
  it('offline time is capped at 7 days', () => {
    const s = fresh();
    advance(s, T0 + 30 * DAY);
    expect(s.lastTick).toBe(T0 + 30 * DAY);
    const ch = coop(s).animals![0];
    expect(ch.age).toBeLessThanOrEqual(3 * DAY + 7 * DAY + 1);
  });
});

describe('animals', () => {
  it('hunger drops 4/h, starving 12h makes sick, treatment cures', () => {
    const s = fresh();
    const ch = coop(s).animals![0];
    ch.hunger = 100;
    advance(s, T0 + 10 * HOUR);
    expect(ch.hunger).toBeCloseTo(60, 5);
    advance(s, T0 + 25 * HOUR); // hunger hits 0 at 25h
    expect(ch.hunger).toBe(0);
    expect(ch.sick).toBe(false);
    advance(s, T0 + 37 * HOUR + MIN);
    expect(ch.sick).toBe(true);
    const h = ch.health;
    advance(s, T0 + 40 * HOUR);
    expect(ch.health).toBeLessThan(h);
    s.coins = 100;
    expect(A.treat(s, ch.id).ok).toBe(true);
    expect(ch.sick).toBe(false);
    expect(s.coins).toBe(70);
  });
  it('hungry animals (<20) do not produce; feeding restores 100', () => {
    const s = fresh();
    const ch = coop(s).animals![0];
    ch.hunger = 10;
    advance(s, T0 + 5 * HOUR);
    expect(ch.ready).toBe(false);
    expect(ch.prod).toBe(0);
    s.storage.items.wheat = 2;
    expect(A.feed(s, ch.id).ok).toBe(true);
    expect(ch.hunger).toBe(100);
    expect(s.storage.items.wheat).toBe(1);
  });
  it('breeds: 2 healthy adults with room eventually produce a baby that grows up', () => {
    const s = fresh(7);
    const c = coop(s);
    // keep everyone fed by topping hunger every simulated day
    let t = T0;
    for (const a of c.animals!) a.hunger = 100;
    let born = false;
    for (let d = 0; d < 60 && !born; d++) {
      for (const a of c.animals!) a.hunger = 100;
      t += DAY;
      const ev = realAdvance(s, t, emptyEvents(), { fixedWeather: true });
      if (ev.births.length) born = true;
    }
    expect(born).toBe(true);
    expect(c.animals!.length).toBeGreaterThan(3);
    const baby = c.animals![c.animals!.length - 1];
    expect(baby.age).toBeLessThan(3 * DAY);
  });
  it('no breeding when the building is full', () => {
    const s = fresh(7);
    const c = coop(s);
    while (c.animals!.length < 6) c.animals!.push({ ...c.animals![0], id: s.nextId++ });
    for (let d = 0; d < 30; d++) {
      for (const a of c.animals!) a.hunger = 100;
      advance(s, T0 + (d + 1) * DAY);
    }
    expect(c.animals!.length).toBe(6);
  });
});

describe('market', () => {
  it('selling lowers the coefficient 2% per unit and reverts toward 1.0', () => {
    const s = fresh();
    s.storage.items.tomato = 10;
    const before = unitPrice(s, 'tomato', T0);
    expect(before).toBe(CROPS.tomato.sell);
    const quote = quoteSale(s, 'tomato', 10, T0);
    const r = A.sell(s, 'tomato', 10, T0);
    expect(r.ok && r.coins).toBe(quote);
    expect(s.market.coef.tomato).toBeCloseTo(0.8, 5);
    advance(s, T0 + 6 * HOUR);
    expect(s.market.coef.tomato).toBeGreaterThan(0.9);
    advance(s, T0 + 48 * HOUR);
    expect(Math.abs(s.market.coef.tomato - 1)).toBeLessThan(0.05);
    for (const v of Object.values(s.market.coef)) {
      expect(v).toBeGreaterThanOrEqual(0.7);
      expect(v).toBeLessThanOrEqual(1.4);
    }
  });
  it('coefficient never drops below 0.7', () => {
    const s = fresh();
    s.storage.items.wheat = 40;
    A.sell(s, 'wheat', 40, T0);
    expect(s.market.coef.wheat).toBeCloseTo(0.7, 5);
  });
  it('Friday market multiplies prices by 1.2', () => {
    const s = fresh();
    const fri = new Date(2026, 10, 20, 10).getTime();
    expect(isFriday(fri)).toBe(true);
    expect(unitPrice(s, 'milk', fri)).toBe(Math.round(90 * 1.2));
  });
});

describe('season by date', () => {
  it.each([
    [0, 'winter'], [1, 'winter'], [2, 'spring'], [4, 'spring'], [5, 'summer'],
    [7, 'summer'], [8, 'autumn'], [10, 'autumn'], [11, 'winter'],
  ])('month %i -> %s', (m, season) => {
    expect(seasonOf(new Date(2026, m as number, 15))).toBe(season);
  });
});

describe('levels', () => {
  it('xp formula and level-up rewards', () => {
    expect(xpToNext(1)).toBe(20);
    expect(xpToNext(2)).toBe(57);
    expect(xpToNext(4)).toBe(160);
    const s = fresh();
    A.addXp(s, 25);
    expect(s.level).toBe(2);
    expect(s.xp).toBe(5);
    expect(s.diamonds).toBe(7);
    expect(s.pendingLevelUps).toEqual([2]);
  });
  it('speed-up costs one diamond per 30 minutes remaining (rounded up)', () => {
    expect(A.speedUpCost(29 * MIN)).toBe(1);
    expect(A.speedUpCost(31 * MIN)).toBe(2);
    expect(A.speedUpCost(8 * HOUR)).toBe(16);
  });
});

describe('save migration', () => {
  it('current saves pass through', () => {
    const s = fresh();
    const m = migrate(JSON.parse(JSON.stringify(s)));
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.coins).toBe(300);
  });
  it('v0 (unversioned) saves are upgraded', () => {
    const old = { coins: 999, level: 3, xp: 4, items: { egg: 5 }, entities: [], lastTick: T0, rng: 5 };
    const m = migrate(old);
    expect(m.version).toBe(1);
    expect(m.coins).toBe(999);
    expect(m.storage.items.egg).toBe(5);
    expect(m.tasks).toBeDefined();
    expect(m.market.coef.wheat).toBe(1);
  });
  it('rejects garbage and future versions', () => {
    expect(() => migrate(null)).toThrow();
    expect(() => migrate({ version: 99 })).toThrow();
  });
});

describe('initial state & shop', () => {
  it('matches the spec', () => {
    const s = fresh();
    expect(s.coins).toBe(300);
    expect(s.diamonds).toBe(5);
    expect(s.level).toBe(1);
    expect(plots(s).length).toBe(6);
    expect(coop(s).animals!.length).toBe(3);
    expect(allAnimals(s).every((x) => x.a.type === 'chicken')).toBe(true);
  });
  it('plot price grows by 10 per existing plot; land expansion requires level', () => {
    const s = fresh();
    s.coins = 10000;
    const before = s.coins;
    expect(A.buyPlot(s).ok).toBe(true);
    expect(before - s.coins).toBe(30 + 60);
    expect(A.expandLand(s).ok).toBe(false);
    s.level = 5;
    expect(A.expandLand(s).ok).toBe(true);
    expect(s.landStage).toBe(1);
  });
});
