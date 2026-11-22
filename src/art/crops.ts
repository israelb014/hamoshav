import { PAL } from './palette';
import { P, isoSprite, type SpriteDef } from './iso';
import type { CropId } from '../sim/data';

// Plant spots on a plot (3 x 3 grid), drawn back to front.
const SPOTS: [number, number][] = [];
for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) SPOTS.push([-0.28 + j * 0.28, -0.28 + i * 0.28]);
SPOTS.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
const BED_H = 7;

type Draw = (x: number, y: number, k: number) => string;

const leaf = (x: number, y: number, rx: number, ry: number, rot: number, c: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" transform="rotate(${rot} ${x} ${y})"/>`;

function seedDraw(x: number, y: number): string {
  return `<ellipse cx="${x}" cy="${y}" rx="6" ry="3" fill="${PAL.soilDark}"/><circle cx="${x - 1.5}" cy="${y - 0.5}" r="1.4" fill="#F3D9A8"/><circle cx="${x + 2}" cy="${y + 0.5}" r="1.2" fill="#F3D9A8"/>`;
}
function sproutDraw(x: number, y: number): string {
  return `<path d="M${x},${y} v-7" stroke="${PAL.leafDark}" stroke-width="1.8"/>` + leaf(x - 3.5, y - 8, 4, 2.2, -30, PAL.leafLight) + leaf(x + 3.5, y - 8, 4, 2.2, 30, PAL.leaf);
}
function dryDraw(x: number, y: number): string {
  return `<path d="M${x},${y} q-2,-8 -7,-10 M${x},${y} q1,-10 5,-12 M${x},${y} q0,-6 -1,-14" stroke="${PAL.withered}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M${x - 7},${y - 10} l-2,3 M${x + 5},${y - 12} l3,2" stroke="${PAL.witheredDark}" stroke-width="2" stroke-linecap="round"/>`;
}

const bush = (x: number, y: number, r: number, c1: string, c2: string) =>
  `<circle cx="${x - r * 0.45}" cy="${y - r * 0.8}" r="${r * 0.7}" fill="${c2}"/><circle cx="${x + r * 0.45}" cy="${y - r * 0.8}" r="${r * 0.7}" fill="${c2}"/><circle cx="${x}" cy="${y - r * 1.25}" r="${r * 0.75}" fill="${c1}"/>`;

const growDraw: Record<CropId, Draw> = {
  wheat: (x, y) =>
    [-4, -1.5, 1.5, 4].map((d) => `<path d="M${x + d},${y} q${d * 0.4},-9 ${d * 0.8},-17" stroke="${PAL.leaf}" stroke-width="2" fill="none" stroke-linecap="round"/>`).join(''),
  tomato: (x, y) => `<path d="M${x},${y} v-8" stroke="${PAL.leafDark}" stroke-width="2"/>` + bush(x, y, 8, PAL.leafLight, PAL.leaf),
  cucumber: (x, y) => leaf(x - 5, y - 4, 6, 4, -20, PAL.leaf) + leaf(x + 5, y - 4, 6, 4, 20, PAL.leafDark) + leaf(x, y - 8, 6, 4, 0, PAL.leafLight),
  corn: (x, y) =>
    `<path d="M${x},${y} v-26" stroke="${PAL.leafDark}" stroke-width="3"/>` +
    leaf(x - 6, y - 14, 8, 2.4, -35, PAL.leaf) + leaf(x + 6, y - 19, 8, 2.4, 35, PAL.leafLight) + leaf(x - 5, y - 23, 6, 2, -40, PAL.leaf),
  strawberry: (x, y) => leaf(x - 5, y - 3, 5, 3.5, -25, PAL.leaf) + leaf(x + 5, y - 3, 5, 3.5, 25, PAL.leafDark) + leaf(x, y - 6, 5, 3.5, 0, PAL.leafLight),
  cauliflower: (x, y) =>
    leaf(x - 6, y - 5, 8, 4.5, -25, PAL.leafDark) + leaf(x + 6, y - 5, 8, 4.5, 25, PAL.leaf) + leaf(x, y - 9, 6, 5, 0, PAL.leafLight),
  watermelon: (x, y) =>
    leaf(x - 6, y - 3, 6, 4, -15, PAL.leaf) + leaf(x + 6, y - 2, 6, 4, 15, PAL.leafDark) + `<ellipse cx="${x}" cy="${y - 4}" rx="4" ry="3" fill="${PAL.melon}"/>`,
};

const ripeDraw: Record<CropId, Draw> = {
  wheat: (x, y) => {
    let s = '';
    for (const d of [-5, -2, 1, 4]) {
      s += `<path d="M${x + d},${y} q${d * 0.3},-10 ${d * 0.6},-20" stroke="${PAL.wheatDark}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      s += `<ellipse cx="${x + d * 1.6}" cy="${y - 23}" rx="2.6" ry="6" fill="${PAL.wheat}" stroke="${PAL.wheatDark}" stroke-width="0.8" transform="rotate(${d * 3} ${x + d * 1.6} ${y - 23})"/>`;
    }
    return s;
  },
  tomato: (x, y) =>
    `<path d="M${x},${y} v-8" stroke="${PAL.leafDark}" stroke-width="2"/>` + bush(x, y, 9, PAL.leafLight, PAL.leaf) +
    [[-5, -9], [4, -7], [1, -14], [-2, -4], [6, -13]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="2.8" fill="${PAL.tomato}"/><circle cx="${x + dx - 0.8}" cy="${y + dy - 0.9}" r="0.9" fill="#fff" opacity="0.7"/>`).join(''),
  cucumber: (x, y) =>
    growDraw.cucumber(x, y, 1) +
    `<rect x="${x - 9}" y="${y - 6}" width="11" height="4.5" rx="2.2" fill="${PAL.cucumber}" stroke="#2F6E25" stroke-width="0.8" transform="rotate(-20 ${x - 4} ${y - 4})"/><rect x="${x + 1}" y="${y - 3}" width="10" height="4.2" rx="2.1" fill="#5DAA44" stroke="#2F6E25" stroke-width="0.8" transform="rotate(15 ${x + 6} ${y - 1})"/>`,
  corn: (x, y) =>
    growDraw.corn(x, y, 1) +
    `<ellipse cx="${x + 3.5}" cy="${y - 15}" rx="3" ry="6.5" fill="${PAL.corn}" stroke="#C99A16" stroke-width="0.8"/>` +
    leaf(x + 2, y - 13, 4, 2, 60, PAL.leafLight) +
    `<path d="M${x},${y - 26} l-3,-5 M${x},${y - 26} l3,-5 M${x},${y - 26} v-6" stroke="#D7B04A" stroke-width="1.4"/>`,
  strawberry: (x, y) =>
    growDraw.strawberry(x, y, 1) +
    [[-5, -1], [4, -2], [0, -7]].map(([dx, dy]) => `<path d="M${x + dx - 3},${y + dy - 2} q3,-2 6,0 q-1,5 -3,6 q-2,-1 -3,-6z" fill="${PAL.strawberry}"/><circle cx="${x + dx - 1}" cy="${y + dy}" r="0.6" fill="#FFE07A"/><circle cx="${x + dx + 1}" cy="${y + dy + 1}" r="0.6" fill="#FFE07A"/>`).join(''),
  cauliflower: (x, y) =>
    leaf(x - 7, y - 4, 8, 4.5, -25, PAL.leafDark) + leaf(x + 7, y - 4, 8, 4.5, 25, PAL.leaf) +
    `<circle cx="${x - 3}" cy="${y - 9}" r="4.5" fill="${PAL.cauliflower}"/><circle cx="${x + 3}" cy="${y - 9}" r="4.5" fill="${PAL.cauliflower}"/><circle cx="${x}" cy="${y - 12}" r="4.5" fill="#FFFDF6"/><circle cx="${x}" cy="${y - 9}" r="5" fill="none" stroke="#E2D8BE" stroke-width="0.8"/>`,
  watermelon: (x, y) =>
    leaf(x - 8, y - 2, 6, 4, -15, PAL.leaf) + leaf(x + 8, y - 1, 6, 4, 15, PAL.leafDark) +
    `<ellipse cx="${x}" cy="${y - 6}" rx="9" ry="6.5" fill="${PAL.melon}"/><path d="M${x - 6},${y - 10} q2,4 0,8 M${x - 1},${y - 12} q2,6 0,12 M${x + 4},${y - 11} q2,5 0,10" stroke="${PAL.melonDark}" stroke-width="1.6" fill="none"/><ellipse cx="${x - 3}" cy="${y - 9}" rx="3" ry="1.5" fill="#fff" opacity="0.25"/>`,
};

export function cropSprite(crop: CropId | 'withered', stage: number): SpriteDef {
  let body = '';
  const spots = crop === 'watermelon' && stage === 3 ? SPOTS.filter((_, i) => i % 2 === 0) : SPOTS;
  for (const [gx, gy] of spots) {
    const [x, y] = P(gx, gy, BED_H);
    if (crop === 'withered') body += dryDraw(x, y + 2);
    else if (stage === 0) body += seedDraw(x, y + 1);
    else if (stage === 1) body += sproutDraw(x, y + 2);
    else if (stage === 2) body += growDraw[crop](x, y + 2, 1);
    else body += ripeDraw[crop](x, y + 2, 1);
  }
  return isoSprite(1, 44, body);
}
