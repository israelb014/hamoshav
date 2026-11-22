// Static game data. Pure – no Phaser / DOM dependencies.

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
export const SEASONS: Season[] = ['winter', 'spring', 'summer', 'autumn'];
export const SEASON_NAMES: Record<Season, string> = {
  winter: 'חורף',
  spring: 'אביב',
  summer: 'קיץ',
  autumn: 'סתיו',
};

export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export type CropId = 'wheat' | 'tomato' | 'cucumber' | 'corn' | 'strawberry' | 'cauliflower' | 'watermelon';
export type TreeId = 'olive' | 'orange' | 'date';
export type AnimalId = 'chicken' | 'sheep' | 'goat' | 'cow';
export type ProductId = 'egg' | 'wool' | 'goatmilk' | 'milk';
export type FruitId = 'olive' | 'orange' | 'date';
export type ItemId = CropId | ProductId | FruitId;

export interface CropDef {
  id: CropId;
  name: string;
  seed: number;
  growMs: number;
  sell: number;
  xp: number;
  level: number;
  seasons: Season[];
}

const ALL: Season[] = ['winter', 'spring', 'summer', 'autumn'];

export const CROPS: Record<CropId, CropDef> = {
  wheat: { id: 'wheat', name: 'חיטה', seed: 5, growMs: 2 * MIN, sell: 9, xp: 1, level: 1, seasons: ALL },
  tomato: { id: 'tomato', name: 'עגבניות שרי', seed: 12, growMs: 30 * MIN, sell: 24, xp: 3, level: 1, seasons: ['spring', 'summer', 'autumn'] },
  cucumber: { id: 'cucumber', name: 'מלפפון', seed: 15, growMs: 1 * HOUR, sell: 32, xp: 4, level: 2, seasons: ['spring', 'summer'] },
  corn: { id: 'corn', name: 'תירס', seed: 25, growMs: 3 * HOUR, sell: 60, xp: 7, level: 4, seasons: ['summer'] },
  strawberry: { id: 'strawberry', name: 'תות', seed: 30, growMs: 4 * HOUR, sell: 75, xp: 8, level: 5, seasons: ['winter', 'spring'] },
  cauliflower: { id: 'cauliflower', name: 'כרובית', seed: 28, growMs: 6 * HOUR, sell: 80, xp: 9, level: 6, seasons: ['winter', 'autumn'] },
  watermelon: { id: 'watermelon', name: 'אבטיח', seed: 45, growMs: 8 * HOUR, sell: 130, xp: 14, level: 8, seasons: ['summer'] },
};
export const CROP_IDS = Object.keys(CROPS) as CropId[];

export interface TreeDef {
  id: TreeId;
  name: string;
  fruitName: string;
  price: number;
  matureMs: number;
  fruitMs: number;
  sell: number;
  xp: number;
  level: number;
  seasons: Season[];
}

export const TREES: Record<TreeId, TreeDef> = {
  olive: { id: 'olive', name: 'עץ זית', fruitName: 'זיתים', price: 150, matureMs: 24 * HOUR, fruitMs: 12 * HOUR, sell: 40, xp: 5, level: 3, seasons: ['autumn'] },
  orange: { id: 'orange', name: 'עץ תפוז', fruitName: 'תפוזים', price: 200, matureMs: 24 * HOUR, fruitMs: 10 * HOUR, sell: 45, xp: 6, level: 5, seasons: ['winter'] },
  date: { id: 'date', name: 'עץ תמר', fruitName: 'תמרים', price: 300, matureMs: 48 * HOUR, fruitMs: 12 * HOUR, sell: 70, xp: 9, level: 9, seasons: ['summer', 'autumn'] },
};
export const TREE_IDS = Object.keys(TREES) as TreeId[];

export type BuildingKind = 'coop' | 'bigcoop' | 'pen' | 'barn';

export interface AnimalDef {
  id: AnimalId;
  name: string;
  babyName: string;
  building: BuildingKind[];
  price: number;
  product: ProductId;
  productMs: number;
  sell: number;
  xp: number;
  food: CropId[];
  level: number;
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  chicken: { id: 'chicken', name: 'תרנגולת', babyName: 'אפרוח', building: ['coop', 'bigcoop'], price: 50, product: 'egg', productMs: 4 * HOUR, sell: 15, xp: 2, food: ['wheat'], level: 1 },
  sheep: { id: 'sheep', name: 'כבשה', babyName: 'טלה', building: ['pen'], price: 200, product: 'wool', productMs: 12 * HOUR, sell: 70, xp: 6, food: ['wheat'], level: 4 },
  goat: { id: 'goat', name: 'עז', babyName: 'גדי', building: ['pen'], price: 250, product: 'goatmilk', productMs: 8 * HOUR, sell: 55, xp: 5, food: ['corn', 'wheat'], level: 6 },
  cow: { id: 'cow', name: 'פרה', babyName: 'עגל', building: ['barn'], price: 500, product: 'milk', productMs: 8 * HOUR, sell: 90, xp: 8, food: ['corn'], level: 7 },
};
export const ANIMAL_IDS = Object.keys(ANIMALS) as AnimalId[];

export const PRODUCT_NAMES: Record<ProductId, string> = {
  egg: 'ביצים',
  wool: 'צמר',
  goatmilk: 'חלב עזים',
  milk: 'חלב',
};

export const ITEM_IDS: ItemId[] = [...CROP_IDS, 'egg', 'wool', 'goatmilk', 'milk', 'olive', 'orange', 'date'];

export function itemName(id: ItemId): string {
  if (id in CROPS) return CROPS[id as CropId].name;
  if (id in PRODUCT_NAMES) return PRODUCT_NAMES[id as ProductId];
  return TREES[id as TreeId].fruitName;
}

export function itemBasePrice(id: ItemId): number {
  if (id in CROPS) return CROPS[id as CropId].sell;
  if (id in PRODUCT_NAMES) return ANIMALS[ANIMAL_IDS.find((a) => ANIMALS[a].product === id)!].sell;
  return TREES[id as TreeId].sell;
}

// ---- Placeable entities ----
export type StructureKind =
  | 'house'
  | BuildingKind
  | 'greenhouse'
  | 'pump'
  | 'tractor';
export type DecoKind = 'bench' | 'tap' | 'cart' | 'geranium' | 'scarecrow' | 'sign';

export interface StructureDef {
  kind: StructureKind;
  name: string;
  price: number;
  level: number;
  size: number; // square footprint
  capacity?: number;
  desc: string;
  buyable: boolean;
}

export const STRUCTURES: Record<StructureKind, StructureDef> = {
  house: { kind: 'house', name: 'בית המושב', price: 0, level: 1, size: 2, desc: 'הבית שלך', buyable: false },
  coop: { kind: 'coop', name: 'לול', price: 100, level: 1, size: 2, capacity: 6, desc: 'עד 6 תרנגולות', buyable: true },
  bigcoop: { kind: 'bigcoop', name: 'לול גדול', price: 600, level: 5, size: 2, capacity: 12, desc: 'עד 12 תרנגולות', buyable: true },
  pen: { kind: 'pen', name: 'דיר', price: 400, level: 4, size: 2, capacity: 6, desc: 'עד 6 כבשים ועזים', buyable: true },
  barn: { kind: 'barn', name: 'רפת', price: 900, level: 7, size: 2, capacity: 4, desc: 'עד 4 פרות', buyable: true },
  greenhouse: { kind: 'greenhouse', name: 'חממה', price: 1500, level: 8, size: 2, desc: '4 חלקות לכל גידול בכל עונה, בלי ייבוש', buyable: true },
  pump: { kind: 'pump', name: 'משאבת מים', price: 800, level: 6, size: 1, desc: 'משקה חלקות ברדיוס 3', buyable: true },
  tractor: { kind: 'tractor', name: 'טרקטור', price: 2500, level: 10, size: 1, desc: 'קוצר את כל החלקות הבשלות בהקשה', buyable: true },
};

export const DECOS: Record<DecoKind, { kind: DecoKind; name: string; price: number; level: number }> = {
  bench: { kind: 'bench', name: 'ספסל', price: 60, level: 2 },
  tap: { kind: 'tap', name: 'ברז מים ישן', price: 80, level: 2 },
  cart: { kind: 'cart', name: 'עגלת עץ', price: 120, level: 3 },
  geranium: { kind: 'geranium', name: 'עציץ גרניום', price: 40, level: 1 },
  scarecrow: { kind: 'scarecrow', name: 'דחליל', price: 150, level: 4 },
  sign: { kind: 'sign', name: 'שלט "ברוכים הבאים למושב"', price: 200, level: 5 },
};
export const DECO_IDS = Object.keys(DECOS) as DecoKind[];

export const GRID = 14;
export const LAND_STAGES = [
  { size: 8, price: 0, level: 1 },
  { size: 10, price: 2000, level: 5 },
  { size: 14, price: 8000, level: 10 },
];

export const ANIMAL_NAMES = [
  'שושנה', 'מזל', 'לולו', 'בלה', 'נחמה', 'פנינה', 'גלי', 'תמר', 'רותי', 'מלכה',
  'זהבה', 'דבורה', 'חמדה', 'נועה', 'ציפי', 'אורה', 'יפה', 'שמחה', 'טובה', 'לאה',
  'מיקי', 'פיצי', 'בובה', 'דודה', 'גאולה', 'שירה', 'רינה', 'עדי',
];

export const WATER_MS = 6 * HOUR;
export const WITHER_MS = 24 * HOUR;
export const ADULT_MS = 3 * DAY;
export const STEP_MS = 10 * MIN;
export const MAX_OFFLINE_MS = 7 * DAY;
export const TREAT_COST = 30;
export const STORAGE_START = 50;
export const STORAGE_STEP = 25;
export function storageUpgradePrice(upgrades: number): number {
  return 200 * Math.pow(2, upgrades);
}
export function plotPrice(existingPlots: number): number {
  return 30 + 10 * existingPlots;
}
