import { PAL } from './palette';
import { artRand, isoSprite, shadow, type SpriteDef } from './iso';
import type { TreeId } from '../sim/data';

export type TreeStage = 'young' | 'mature' | 'fruit';

function canopy(cx: number, cy: number, r: number, light: string, mid: string, dark: string, seed: number): string {
  const rnd = artRand(seed);
  let s = `<ellipse cx="${cx}" cy="${cy + r * 0.25}" rx="${r * 1.05}" ry="${r * 0.85}" fill="${dark}"/>`;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    s += `<circle cx="${cx + Math.cos(a) * r * 0.55}" cy="${cy + Math.sin(a) * r * 0.4 - r * 0.05}" r="${r * (0.48 + rnd() * 0.1)}" fill="${mid}"/>`;
  }
  s += `<circle cx="${cx - r * 0.25}" cy="${cy - r * 0.35}" r="${r * 0.45}" fill="${light}"/>`;
  s += `<circle cx="${cx + r * 0.2}" cy="${cy - r * 0.15}" r="${r * 0.3}" fill="${light}" opacity="0.7"/>`;
  return s;
}

function fruitDots(cx: number, cy: number, r: number, color: string, n: number, seed: number, size = 3.6): string {
  const rnd = artRand(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.8;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.75;
    s += `<circle cx="${x}" cy="${y}" r="${size}" fill="${color}"/><circle cx="${x - size * 0.3}" cy="${y - size * 0.35}" r="${size * 0.3}" fill="#fff" opacity="0.6"/>`;
  }
  return s;
}

function olive(stage: TreeStage): string {
  const k = stage === 'young' ? 0.55 : 1;
  let s = shadow(4, 4, 34 * k, 14 * k);
  s += `<path d="M-4,4 C-6,-14 -12,-22 -8,-${40 * k} M2,4 C4,-12 8,-24 6,-${42 * k} M-2,-${18 * k} L-14,-${34 * k}" stroke="${PAL.trunk}" stroke-width="${7 * k}" fill="none" stroke-linecap="round"/>`;
  s += canopy(0, -58 * k, 30 * k, PAL.oliveLight, PAL.olive, PAL.oliveDark, 3);
  if (stage === 'fruit') s += fruitDots(0, -58 * k, 28, PAL.oliveFruit, 14, 7, 2.6);
  return s;
}

function orange(stage: TreeStage): string {
  const k = stage === 'young' ? 0.55 : 1;
  let s = shadow(4, 4, 32 * k, 13 * k);
  s += `<path d="M0,4 L0,-${34 * k}" stroke="${PAL.trunk}" stroke-width="${8 * k}" stroke-linecap="round"/>`;
  s += canopy(0, -60 * k, 30 * k, PAL.leafLight, PAL.leaf, PAL.leafDark, 11);
  if (stage === 'fruit') s += fruitDots(0, -58 * k, 30, PAL.orange, 11, 5, 4.2);
  return s;
}

function date(stage: TreeStage): string {
  const k = stage === 'young' ? 0.5 : 1;
  const top = -96 * k;
  let s = shadow(6, 4, 30 * k, 12 * k);
  // ringed trunk
  s += `<path d="M0,4 Q5,${top / 2} 2,${top}" stroke="${PAL.trunk}" stroke-width="${10 * k}" fill="none" stroke-linecap="round"/>`;
  for (let i = 1; i < 9; i++) {
    const y = (top * i) / 9;
    s += `<path d="M${-4 * k + 2.5 * Math.sin((i / 9) * 3)},${y} l${9 * k},-2" stroke="${PAL.trunkDark}" stroke-width="1.6"/>`;
  }
  const fr = (ang: number, len: number, c: string) => {
    const a = (ang * Math.PI) / 180;
    const ex = 2 + Math.cos(a) * len * k, ey = top + Math.sin(a) * len * 0.6 * k + len * 0.25 * k;
    const mx = 2 + Math.cos(a) * len * 0.5 * k, my = top + Math.sin(a) * len * 0.3 * k - 10 * k;
    return `<path d="M2,${top} Q${mx},${my} ${ex},${ey}" stroke="${c}" stroke-width="${9 * k}" fill="none" stroke-linecap="round"/><path d="M2,${top} Q${mx},${my} ${ex},${ey}" stroke="${PAL.leafLight}" stroke-width="${2 * k}" fill="none" stroke-linecap="round" opacity="0.6"/>`;
  };
  s += [200, 340, 250, 290].map((a) => fr(a, 44, PAL.leafDark)).join('');
  if (stage === 'fruit') {
    s += `<g><ellipse cx="-6" cy="${top + 10}" rx="8" ry="10" fill="${PAL.date}"/><ellipse cx="10" cy="${top + 12}" rx="7" ry="9" fill="#C0682F"/>${fruitDots(2, top + 12, 12, '#7E3B1C', 10, 3, 2.4)}</g>`;
  }
  s += [160, 20, 120, 60, 180, 0].map((a) => fr(a, 50, PAL.leaf)).join('');
  return s;
}

export function treeSprite(id: TreeId, stage: TreeStage): SpriteDef {
  const body = id === 'olive' ? olive(stage) : id === 'orange' ? orange(stage) : date(stage);
  return isoSprite(1, 120, `<g transform="translate(0,8)">${body}</g>`);
}

/** Background scenery tree (outside the farm). */
export function bgTree(variant: number): SpriteDef {
  if (variant === 2) return treeSprite('date', 'mature');
  const k = variant === 1 ? 0.9 : 1.15;
  let s = shadow(4, 4, 36 * k, 14 * k);
  s += `<path d="M0,4 L0,-${30 * k}" stroke="${PAL.trunk}" stroke-width="${9 * k}" stroke-linecap="round"/>`;
  s += canopy(0, -58 * k, 34 * k, variant ? PAL.oliveLight : PAL.leafLight, variant ? PAL.olive : PAL.leaf, variant ? PAL.oliveDark : PAL.leafDark, 17 + variant);
  return isoSprite(1, 120, `<g transform="translate(0,8)">${s}</g>`);
}
