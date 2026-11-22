import {
  ADULT_MS,
  ANIMAL_NAMES,
  GRID,
  ITEM_IDS,
  LAND_STAGES,
  STORAGE_START,
  STRUCTURES,
  type AnimalId,
  type CropId,
  type DecoKind,
  type ItemId,
  type StructureKind,
  type TreeId,
} from './data';
import { pick } from './rng';
import { rollWeather, weatherSlot, type Weather } from './season';

export const SAVE_VERSION = 1;

export interface Plot {
  crop: CropId | null;
  /** ms of (watered) growth accumulated */
  grow: number;
  /** ms of water remaining */
  water: number;
  /** ms since the crop became ripe */
  ripeFor: number;
  withered: boolean;
}

export interface Animal {
  id: number;
  type: AnimalId;
  name: string;
  age: number; // ms
  hunger: number; // 0..100 (100 = full)
  health: number; // 0..100
  happiness: number; // 0..100
  prod: number; // ms of production accumulated
  ready: boolean;
  starveMs: number;
  sick: boolean;
  lastPet: number; // timestamp
}

interface EntityBase {
  id: number;
  x: number;
  y: number;
}
export interface PlotEntity extends EntityBase {
  kind: 'plot';
  plot: Plot;
}
export interface StructureEntity extends EntityBase {
  kind: 'structure';
  type: StructureKind;
  animals?: Animal[];
  plots?: Plot[];
}
export interface TreeEntity extends EntityBase {
  kind: 'tree';
  type: TreeId;
  age: number;
  fruit: number;
  hasFruit: boolean;
}
export interface DecoEntity extends EntityBase {
  kind: 'deco';
  type: DecoKind;
}
export type Entity = PlotEntity | StructureEntity | TreeEntity | DecoEntity;

export type TaskType = 'harvest' | 'collect' | 'sell' | 'feed' | 'plant';
export interface Task {
  id: number;
  type: TaskType;
  target?: string;
  n: number;
  progress: number;
  coins: number;
  xp: number;
  diamonds: number;
  claimed: boolean;
}

export interface GameState {
  version: number;
  createdAt: number;
  lastTick: number;
  savedAt: number;
  rng: number;
  nextId: number;
  coins: number;
  diamonds: number;
  level: number;
  xp: number;
  landStage: number;
  storage: { cap: number; upgrades: number; items: Partial<Record<ItemId, number>> };
  entities: Entity[];
  weather: Weather;
  market: { coef: Record<string, number>; prev: Record<string, number> };
  tasks: { day: string; list: Task[] };
  settings: { sound: boolean };
  tutorial: { step: number; done: boolean };
  pendingLevelUps: number[];
  stats: { harvested: number; sold: number };
}

export function emptyPlot(): Plot {
  return { crop: null, grow: 0, water: 0, ripeFor: 0, withered: false };
}

export function newAnimal(s: GameState, type: AnimalId, now: number, adult: boolean): Animal {
  return {
    id: s.nextId++,
    type,
    name: pick(s, ANIMAL_NAMES),
    age: adult ? ADULT_MS : 0,
    hunger: 100,
    health: 100,
    happiness: 80,
    prod: 0,
    ready: false,
    starveMs: 0,
    sick: false,
    lastPet: now - 3600_000,
  };
}

export function localDay(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function createInitialState(now: number, seed = (Math.random() * 2 ** 32) >>> 0): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    createdAt: now,
    lastTick: now,
    savedAt: now,
    rng: seed >>> 0,
    nextId: 1,
    coins: 300,
    diamonds: 5,
    level: 1,
    xp: 0,
    landStage: 0,
    storage: { cap: STORAGE_START, upgrades: 0, items: { wheat: 3 } },
    entities: [],
    weather: { slot: 0, type: 'sun', temp: 20 },
    market: { coef: {}, prev: {} },
    tasks: { day: '', list: [] },
    settings: { sound: false },
    tutorial: { step: 0, done: false },
    pendingLevelUps: [],
    stats: { harvested: 0, sold: 0 },
  };
  for (const id of ITEM_IDS) {
    s.market.coef[id] = 1;
    s.market.prev[id] = 1;
  }
  s.weather = rollWeather(s, weatherSlot(now));
  s.entities.push({ id: s.nextId++, kind: 'structure', type: 'house', x: 3, y: 3 });
  const coop: StructureEntity = { id: s.nextId++, kind: 'structure', type: 'coop', x: 8, y: 3, animals: [] };
  for (let i = 0; i < 3; i++) {
    const hen = newAnimal(s, 'chicken', now, true);
    hen.hunger = 60; // a little hungry so the tutorial's "feed" step works right away
    coop.animals!.push(hen);
  }
  s.entities.push(coop);
  for (let y = 7; y <= 8; y++)
    for (let x = 5; x <= 7; x++) s.entities.push({ id: s.nextId++, kind: 'plot', x, y, plot: emptyPlot() });
  return s;
}

/** Bring an older / partial save up to the current version. */
export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('שמירה לא תקינה');
  const s = raw as Record<string, unknown>;
  let version = typeof s.version === 'number' ? s.version : 0;
  if (version > SAVE_VERSION) throw new Error('השמירה נוצרה בגרסה חדשה יותר של המשחק');
  // v0 -> v1: pre-release saves had no version, no tasks/settings/tutorial and a flat items map.
  if (version === 0) {
    const now = typeof s.lastTick === 'number' ? s.lastTick : Date.now();
    const base = createInitialState(now, typeof s.rng === 'number' ? s.rng : 1);
    const merged: Record<string, unknown> = { ...base, ...s };
    if (s.items && !s.storage) {
      merged.storage = { ...base.storage, items: s.items };
      delete merged.items;
    }
    merged.market = { ...base.market, ...((s.market as object) ?? {}) };
    merged.settings = { ...base.settings, ...((s.settings as object) ?? {}) };
    merged.tutorial = (s.tutorial as object) ?? { step: 5, done: true };
    merged.tasks = (s.tasks as object) ?? { day: '', list: [] };
    merged.pendingLevelUps = [];
    merged.stats = (s.stats as object) ?? { harvested: 0, sold: 0 };
    merged.version = 1;
    Object.assign(s, merged);
    version = 1;
  }
  // Future: if (version === 1) { ...; version = 2; }
  const st = s as unknown as GameState;
  for (const id of ITEM_IDS) {
    if (typeof st.market.coef[id] !== 'number') st.market.coef[id] = 1;
    if (typeof st.market.prev[id] !== 'number') st.market.prev[id] = st.market.coef[id];
  }
  return st;
}

// ---- Grid helpers ----
export function landBounds(s: GameState): { min: number; max: number } {
  const size = LAND_STAGES[s.landStage].size;
  const min = (GRID - size) / 2;
  return { min, max: min + size - 1 };
}

export function entitySize(e: Entity): number {
  return e.kind === 'structure' ? STRUCTURES[e.type].size : 1;
}

export function isFree(s: GameState, x: number, y: number, size: number, ignoreId?: number): boolean {
  const { min, max } = landBounds(s);
  if (x < min || y < min || x + size - 1 > max || y + size - 1 > max) return false;
  for (const e of s.entities) {
    if (e.id === ignoreId) continue;
    const es = entitySize(e);
    if (x < e.x + es && x + size > e.x && y < e.y + es && y + size > e.y) return false;
  }
  return true;
}

export function findFreeSpot(s: GameState, size: number): { x: number; y: number } | null {
  const { min, max } = landBounds(s);
  const c = GRID / 2 - size / 2;
  const cands: { x: number; y: number; d: number }[] = [];
  for (let y = min; y <= max; y++)
    for (let x = min; x <= max; x++) cands.push({ x, y, d: Math.abs(x - c) + Math.abs(y - c) + y * 0.001 + x * 0.0001 });
  cands.sort((a, b) => a.d - b.d);
  for (const p of cands) if (isFree(s, p.x, p.y, size)) return { x: p.x, y: p.y };
  return null;
}

export function storageUsed(s: GameState): number {
  let n = 0;
  for (const v of Object.values(s.storage.items)) n += v ?? 0;
  return n;
}

export function allAnimals(s: GameState): { a: Animal; b: StructureEntity }[] {
  const out: { a: Animal; b: StructureEntity }[] = [];
  for (const e of s.entities) if (e.kind === 'structure' && e.animals) for (const a of e.animals) out.push({ a, b: e });
  return out;
}

export function findEntity(s: GameState, id: number): Entity | undefined {
  return s.entities.find((e) => e.id === id);
}
