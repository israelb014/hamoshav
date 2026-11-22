import {
  ADULT_MS,
  ANIMALS,
  CROPS,
  DAY,
  HOUR,
  MAX_OFFLINE_MS,
  STEP_MS,
  STRUCTURES,
  TREES,
  WATER_MS,
  WITHER_MS,
  type AnimalId,
  type CropId,
  type ProductId,
  type TreeId,
} from './data';
import { marketHourly } from './market';
import { nextRandom } from './rng';
import { rollWeather, seasonOf, weatherSlot } from './season';
import { refreshTasksIfNewDay } from './tasks';
import { newAnimal, type Animal, type GameState, type Plot, type StructureEntity } from './state';

/** Aggregated happenings during a simulated period (used for the "while you were away" panel). */
export interface SimEvents {
  rain: number; // number of weather slots with rain
  heat: number;
  products: Partial<Record<ProductId, number>>;
  births: { type: AnimalId; name: string }[];
  ripened: Partial<Record<CropId, number>>;
  fruits: Partial<Record<TreeId, number>>;
  hungry: { name: string; type: AnimalId }[];
  sick: { name: string; type: AnimalId }[];
  withered: number;
  dried: number;
}

export function emptyEvents(): SimEvents {
  return { rain: 0, heat: 0, products: {}, births: [], ripened: {}, fruits: {}, hungry: [], sick: [], withered: 0, dried: 0 };
}

export const HUNGER_PER_HOUR = 4;
export const STARVE_SICK_MS = 12 * HOUR;
export const BREED_CHANCE_PER_DAY = 0.1;
const BREED_CHANCE_PER_HOUR = 1 - Math.pow(1 - BREED_CHANCE_PER_DAY, 1 / 24);
export const PUMP_RADIUS = 3;
export const DECO_RADIUS = 3;

function cheb(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function growPlot(p: Plot, dt: number, dryRate: number, alwaysWet: boolean, ev: SimEvents): void {
  if (alwaysWet) p.water = WATER_MS;
  if (!p.crop || p.withered) {
    p.water = Math.max(0, p.water - dt * dryRate);
    return;
  }
  const def = CROPS[p.crop];
  if (p.grow < def.growMs) {
    const wetTime = alwaysWet ? dt : Math.min(dt, p.water / dryRate);
    const before = p.grow;
    p.grow = Math.min(def.growMs, p.grow + wetTime);
    if (p.grow >= def.growMs) {
      ev.ripened[p.crop] = (ev.ripened[p.crop] ?? 0) + 1;
      p.ripeFor += dt - (def.growMs - before);
    }
    const hadWater = p.water > 0;
    if (!alwaysWet) p.water = Math.max(0, p.water - dt * dryRate);
    if (hadWater && p.water === 0 && p.grow < def.growMs) ev.dried++;
  } else {
    p.ripeFor += dt;
    if (!alwaysWet) p.water = Math.max(0, p.water - dt * dryRate);
  }
  if (p.grow >= def.growMs && p.ripeFor >= WITHER_MS) {
    p.withered = true;
    ev.withered++;
  }
}

function stepAnimal(s: GameState, a: Animal, b: StructureEntity, dt: number, ev: SimEvents): void {
  const def = ANIMALS[a.type];
  a.age += dt;
  const h0 = a.hunger;
  const drop = (HUNGER_PER_HOUR * dt) / HOUR;
  a.hunger = Math.max(0, h0 - drop);
  // time spent with hunger >= 20 during this step
  const fedTime = h0 <= 20 ? 0 : Math.min(dt, ((h0 - 20) / HUNGER_PER_HOUR) * HOUR);
  if (h0 >= 20 && a.hunger < 20 && !ev.hungry.some((x) => x.name === a.name && x.type === a.type)) ev.hungry.push({ name: a.name, type: a.type });
  if (a.hunger === 0) {
    const zeroAt = (h0 / HUNGER_PER_HOUR) * HOUR;
    a.starveMs += Math.max(0, dt - zeroAt);
  } else a.starveMs = 0;
  if (!a.sick && a.starveMs >= STARVE_SICK_MS) {
    a.sick = true;
    ev.sick.push({ name: a.name, type: a.type });
  }
  if (a.sick) a.health = Math.max(5, a.health - (3 * dt) / HOUR);
  else if (a.hunger >= 20) a.health = Math.min(100, a.health + (2 * dt) / HOUR);
  if (a.age >= ADULT_MS && !a.sick && !a.ready && fedTime > 0) {
    a.prod += fedTime * (a.happiness >= 70 ? 1.1 : 1);
    if (a.prod >= def.productMs) {
      a.prod = 0;
      a.ready = true;
      ev.products[def.product] = (ev.products[def.product] ?? 0) + 1;
    }
  }
  void s;
  void b;
}

function hourlyAnimals(s: GameState, now: number, ev: SimEvents): void {
  const decos = s.entities.filter((e) => e.kind === 'deco');
  for (const e of s.entities) {
    if (e.kind !== 'structure' || !e.animals) continue;
    const cap = STRUCTURES[e.type].capacity ?? 0;
    const crowded = e.animals.length >= cap;
    const near = decos.filter((d) => cheb(d.x, d.y, e.x + 0.5, e.y + 0.5) <= DECO_RADIUS + 0.5).length;
    for (const a of e.animals) {
      const delta = -2 + (crowded ? 0 : 2) + near - (a.hunger < 20 ? 2 : 0) - (a.sick ? 3 : 0);
      a.happiness = Math.min(100, Math.max(0, a.happiness + delta));
    }
    // breeding
    const types = [...new Set(e.animals.map((a) => a.type))].sort();
    for (const t of types) {
      const adults = e.animals.filter((a) => a.type === t && a.age > ADULT_MS && a.health > 70);
      if (adults.length < 2 || e.animals.length >= cap) continue;
      if (nextRandom(s) < BREED_CHANCE_PER_HOUR) {
        const baby = newAnimal(s, t, now, false);
        e.animals.push(baby);
        ev.births.push({ type: t, name: baby.name });
      }
    }
  }
}

function stepWorld(s: GameState, t0: number, dt: number, ev: SimEvents): void {
  const raining = s.weather.type === 'rain';
  const dryRate = s.weather.type === 'heat' ? 2 : 1;
  const pumps = s.entities.filter((e) => e.kind === 'structure' && e.type === 'pump');
  const season = seasonOf(t0);
  for (const e of s.entities) {
    if (e.kind === 'plot') {
      if (raining || pumps.some((p) => cheb(p.x, p.y, e.x, e.y) <= PUMP_RADIUS)) e.plot.water = WATER_MS;
      growPlot(e.plot, dt, dryRate, false, ev);
    } else if (e.kind === 'structure') {
      if (e.plots) for (const p of e.plots) growPlot(p, dt, 1, true, ev);
      if (e.animals) for (const a of e.animals) stepAnimal(s, a, e, dt, ev);
    } else if (e.kind === 'tree') {
      const def = TREES[e.type];
      const wasMature = e.age >= def.matureMs;
      e.age += dt;
      if (wasMature && !e.hasFruit && def.seasons.includes(season)) {
        e.fruit += dt;
        if (e.fruit >= def.fruitMs) {
          e.fruit = 0;
          e.hasFruit = true;
          ev.fruits[e.type] = (ev.fruits[e.type] ?? 0) + 1;
        }
      }
    }
  }
}

/**
 * Advance the simulation to `now`. Works for both live play (small dt) and offline
 * catch-up (up to 7 days) in steps of at most 10 minutes. Random events happen only on
 * hour / weather-slot boundaries so results are deterministic for a given seed.
 */
export function advance(
  s: GameState,
  now: number,
  ev: SimEvents = emptyEvents(),
  opts: { fixedWeather?: boolean } = {},
): SimEvents {
  if (now - s.lastTick > MAX_OFFLINE_MS) s.lastTick = now - MAX_OFFLINE_MS;
  refreshTasksIfNewDay(s, s.lastTick);
  while (s.lastTick < now) {
    const t0 = s.lastTick;
    const slot = weatherSlot(t0);
    if (s.weather.slot !== slot && opts.fixedWeather) s.weather.slot = slot;
    if (s.weather.slot !== slot) {
      s.weather = rollWeather(s, slot);
      if (s.weather.type === 'rain') ev.rain++;
      if (s.weather.type === 'heat') ev.heat++;
    }
    const nextStep = Math.floor(t0 / STEP_MS) * STEP_MS + STEP_MS;
    const t1 = Math.min(now, nextStep);
    stepWorld(s, t0, t1 - t0, ev);
    s.lastTick = t1;
    if (Math.floor(t1 / HOUR) > Math.floor(t0 / HOUR)) {
      marketHourly(s);
      hourlyAnimals(s, t1, ev);
    }
    if (Math.floor(t1 / DAY) !== Math.floor(t0 / DAY) || t1 === now) refreshTasksIfNewDay(s, t1);
  }
  return ev;
}

export function hasEvents(ev: SimEvents): boolean {
  return (
    ev.rain + ev.heat + ev.withered + ev.dried + ev.births.length + ev.hungry.length + ev.sick.length > 0 ||
    Object.keys(ev.products).length > 0 ||
    Object.keys(ev.ripened).length > 0 ||
    Object.keys(ev.fruits).length > 0
  );
}
