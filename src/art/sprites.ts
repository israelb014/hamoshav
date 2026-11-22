// Sprite registry: every sprite has a fixed id. If public/sprites/<id>.png exists at build
// time, it is used instead of the generated SVG (see README).
import overrides from 'virtual:sprite-overrides';
import { ANIMAL_IDS, CROP_IDS, DECO_IDS, ITEM_IDS, SEASONS, STRUCTURES, TREE_IDS, type StructureKind } from '../sim/data';
import type { SpriteDef } from './iso';
import { cloud, fenceSprite, grassTile, pathTile, plotTile, puddle, rainDrop, selection, sparkle } from './tiles';
import { cropSprite } from './crops';
import { bgTree, treeSprite, type TreeStage } from './trees';
import { animalSprite } from './animals';
import { structureSprite } from './buildings';
import { decoSprite } from './decos';
import { bubbleSprite, itemIconBody, itemSprite } from './items';
import { ICON, type IconName } from './icons';

const iconInner = (name: IconName) => ICON[name].replace(/^<svg[^>]*>/, '<svg x="4" y="4" width="56" height="56" viewBox="0 0 48 48">');

const registry = new Map<string, () => SpriteDef>();
const reg = (id: string, fn: () => SpriteDef) => registry.set(id, fn);

for (const s of SEASONS) for (let v = 0; v < 3; v++) reg(`tile_grass_${s}_${v}`, () => grassTile(s, v));
reg('tile_path', pathTile);
reg('plot_dry', () => plotTile(false));
reg('plot_wet', () => plotTile(true));
reg('fence_x', () => fenceSprite('x'));
reg('fence_y', () => fenceSprite('y'));
for (const c of CROP_IDS) for (let st = 0; st < 4; st++) reg(`crop_${c}_stage${st}`, () => cropSprite(c, st));
reg('crop_withered', () => cropSprite('withered', 0));
for (const t of TREE_IDS) for (const st of ['young', 'mature', 'fruit'] as TreeStage[]) reg(`tree_${t}_${st}`, () => treeSprite(t, st));
for (let v = 0; v < 3; v++) reg(`bgtree_${v}`, () => bgTree(v));
for (const a of ANIMAL_IDS) reg(`animal_${a}`, () => animalSprite(a));
for (const k of Object.keys(STRUCTURES) as StructureKind[]) reg(`bld_${k}`, () => structureSprite(k));
for (const d of DECO_IDS) reg(`deco_${d}`, () => decoSprite(d));
for (const i of ITEM_IDS) reg(`item_${i}`, () => itemSprite(i));
for (const i of ITEM_IDS) reg(`bubble_item_${i}`, () => bubbleSprite(itemIconBody(i)));
reg('bubble_water', () => bubbleSprite(iconInner('drop')));
reg('bubble_sick', () => bubbleSprite(iconInner('sick'), '#FFE3E0'));
reg('bubble_hungry', () => bubbleSprite(iconInner('food'), '#FFF1C9'));
reg('bubble_withered', () => bubbleSprite(iconInner('shovel')));
reg('fx_cloud', cloud);
reg('fx_rain', rainDrop);
reg('fx_puddle', puddle);
reg('fx_sparkle', sparkle);
for (const n of [1, 2]) {
  reg(`sel_${n}_ok`, () => selection(n, true));
  reg(`sel_${n}_bad`, () => selection(n, false));
}

export const SPRITE_IDS = [...registry.keys()];
const overrideSet = new Set(overrides);

export function hasOverride(id: string): boolean {
  return overrideSet.has(id);
}

const cache = new Map<string, SpriteDef>();
export function getSprite(id: string): SpriteDef {
  let d = cache.get(id);
  if (!d) {
    const fn = registry.get(id);
    if (!fn) throw new Error(`unknown sprite ${id}`);
    d = fn();
    cache.set(id, d);
  }
  return d;
}

const urlCache = new Map<string, string>();
/** URL usable in <img src>: PNG override if present, otherwise an SVG data URL. */
export function spriteUrl(id: string): string {
  let u = urlCache.get(id);
  if (!u) {
    u = hasOverride(id)
      ? `${import.meta.env.BASE_URL}sprites/${id}.png`
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(getSprite(id).svg)}`;
    urlCache.set(id, u);
  }
  return u;
}
