import { PAL } from './palette';
import { P, box, isoSprite, shadow, type SpriteDef } from './iso';
import type { DecoKind } from '../sim/data';

function bench(): string {
  let s = shadow(0, 4, 36, 12);
  const leg = (gx: number, gy: number) => box(gx - 0.03, gy - 0.03, gx + 0.03, gy + 0.03, 0, 12, { top: PAL.woodDeep, left: PAL.woodDark, right: PAL.woodDeep });
  s += leg(-0.3, -0.05) + leg(-0.3, 0.12) + leg(0.3, -0.05) + leg(0.3, 0.12);
  s += box(-0.36, -0.1, 0.36, 0.16, 12, 4, { top: PAL.woodLight, left: PAL.wood, right: PAL.woodDark });
  s += box(-0.36, -0.14, 0.36, -0.08, 16, 16, { top: PAL.woodLight, left: PAL.wood, right: PAL.woodDark });
  return s;
}

function tap(): string {
  let s = shadow(0, 4, 22, 9);
  s += box(-0.06, -0.06, 0.06, 0.06, 0, 30, { top: PAL.metal, left: PAL.metal, right: PAL.metalDark });
  const [x, y] = P(0.06, 0, 26);
  s += `<path d="M${x},${y} q12,0 12,10" stroke="${PAL.metalDark}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  const [hx, hy] = P(0, 0, 33);
  s += `<path d="M${hx - 7},${hy} h14" stroke="#C8453A" stroke-width="4" stroke-linecap="round"/><circle cx="${hx}" cy="${hy}" r="3" fill="#C8453A"/>`;
  s += `<ellipse cx="${x + 12}" cy="${y + 26}" rx="10" ry="4" fill="${PAL.water}" opacity="0.7"/>`;
  return s;
}

function cart(): string {
  let s = shadow(0, 4, 40, 14);
  s += box(-0.32, -0.18, 0.28, 0.18, 12, 16, { top: PAL.woodDark, left: PAL.wood, right: PAL.woodDark });
  // produce
  const [cx, cy] = P(-0.02, 0, 28);
  for (const [dx, dy, c] of [[-10, -2, PAL.tomato], [-2, -5, PAL.orange], [7, -2, PAL.melon], [0, 2, PAL.corn]] as const)
    s += `<circle cx="${cx + dx}" cy="${cy + dy}" r="6" fill="${c}"/>`;
  const wheel = (gx: number, gy: number) => {
    const [x, y] = P(gx, gy, 12);
    return `<ellipse cx="${x}" cy="${y}" rx="8" ry="12" fill="none" stroke="${PAL.woodDeep}" stroke-width="3.5"/><path d="M${x},${y - 12} v24 M${x - 8},${y} h16" stroke="${PAL.woodDeep}" stroke-width="2"/>`;
  };
  s += wheel(0.05, 0.22);
  const [hx, hy] = P(0.3, 0, 18);
  s += `<path d="M${hx},${hy} l26,6" stroke="${PAL.woodDark}" stroke-width="4" stroke-linecap="round"/>`;
  return s;
}

function geranium(): string {
  let s = shadow(0, 4, 18, 8);
  s += `<path d="M-11,-18 L11,-18 L8,2 L-8,2 Z" fill="#C8693A"/><rect x="-13" y="-22" width="26" height="6" rx="2" fill="#DB7F4C"/>`;
  s += `<circle cx="-7" cy="-27" r="8" fill="${PAL.leafDark}"/><circle cx="7" cy="-27" r="8" fill="${PAL.leaf}"/><circle cx="0" cy="-33" r="8" fill="${PAL.leafLight}"/>`;
  for (const [x, y] of [[-8, -36], [6, -38], [0, -44], [10, -30], [-11, -29]]) s += `<circle cx="${x}" cy="${y}" r="4.2" fill="${PAL.geranium}"/><circle cx="${x}" cy="${y}" r="1.4" fill="#FFD0D6"/>`;
  return s;
}

function scarecrow(): string {
  let s = shadow(0, 4, 20, 8);
  s += `<path d="M0,2 V-70 M-24,-50 H24" stroke="${PAL.woodDark}" stroke-width="4" stroke-linecap="round"/>`;
  s += `<path d="M-14,-56 h28 l-4,30 h-20z" fill="#5C8BC8"/><path d="M-26,-54 h12 v8 h-12z M14,-54 h12 v8 h-12z" fill="#4A78B5"/>`;
  s += `<path d="M-10,-40 h20" stroke="#E0B24A" stroke-width="2"/>`;
  s += `<circle cx="0" cy="-66" r="10" fill="#F1D9A6"/><circle cx="-3.5" cy="-67" r="1.5" fill="${PAL.black}"/><circle cx="3.5" cy="-67" r="1.5" fill="${PAL.black}"/><path d="M-4,-62 q4,3 8,0" stroke="${PAL.black}" stroke-width="1.3" fill="none"/>`;
  s += `<path d="M-16,-72 h32 l-6,-4 q-10,-14 -14,0z" fill="${PAL.wheatDark}"/><path d="M-16,-72 h32" stroke="#A97A1E" stroke-width="3"/>`;
  s += `<path d="M-26,-48 l-4,4 M26,-48 l4,4 M-8,-26 l-2,6 M8,-26 l2,6" stroke="${PAL.wheat}" stroke-width="2"/>`;
  return s;
}

function sign(): string {
  let s = shadow(0, 4, 30, 10);
  s += box(-0.3, -0.03, -0.25, 0.03, 0, 40, { top: PAL.woodDark, left: PAL.wood, right: PAL.woodDark });
  s += box(0.25, -0.03, 0.3, 0.03, 0, 40, { top: PAL.woodDark, left: PAL.wood, right: PAL.woodDark });
  s += box(-0.38, -0.02, 0.38, 0.02, 28, 26, { top: PAL.woodLight, left: '#F3E3C3', right: PAL.wood, stroke: PAL.woodDark });
  // lettering strokes (abstract, so no font needed inside the sprite)
  const a = P(-0.3, 0.03, 46), b = P(0.3, 0.03, 46), c = P(-0.22, 0.03, 36), d = P(0.22, 0.03, 36);
  s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#3E7B2E" stroke-width="4" stroke-linecap="round" stroke-dasharray="9 4"/>`;
  s += `<line x1="${c[0]}" y1="${c[1]}" x2="${d[0]}" y2="${d[1]}" stroke="#A9412A" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="6 4"/>`;
  s += `<circle cx="${(a[0] + b[0]) / 2 + 30}" cy="${(a[1] + b[1]) / 2 - 18}" r="5" fill="${PAL.flowerPink}"/>`;
  return s;
}

export function decoSprite(kind: DecoKind): SpriteDef {
  const body = { bench, tap, cart, geranium, scarecrow, sign }[kind]();
  return isoSprite(1, 70, body);
}
