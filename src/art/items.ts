import { PAL } from './palette';
import { flatSprite, type SpriteDef } from './iso';
import type { ItemId } from '../sim/data';

// 64 x 64 item icons used in the UI (storage, market, bubbles).
const shade = `<ellipse cx="32" cy="56" rx="18" ry="4" fill="rgba(70,40,15,0.18)"/>`;
const hl = (x: number, y: number, r = 3) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}" fill="#fff" opacity="0.55"/>`;

const ICONS: Record<ItemId, string> = {
  wheat:
    shade +
    [-10, -4, 2, 8].map((d) => `<path d="M32,54 Q${32 + d * 0.5},34 ${32 + d * 1.3},16" stroke="${PAL.wheatDark}" stroke-width="2.5" fill="none"/><ellipse cx="${32 + d * 1.3}" cy="16" rx="4" ry="9" fill="${PAL.wheat}" stroke="${PAL.wheatDark}" stroke-width="1.2" transform="rotate(${d * 2} ${32 + d * 1.3} 16)"/>`).join('') +
    `<path d="M22,40 q10,4 20,0" stroke="${PAL.roof}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  tomato:
    shade +
    `<circle cx="24" cy="38" r="12" fill="${PAL.tomato}"/><circle cx="40" cy="40" r="12" fill="#D42F23"/><circle cx="32" cy="26" r="11" fill="${PAL.tomato}"/>` +
    `<path d="M32,16 l-5,4 l5,-1 l5,1z M24,27 l-4,3 l4,-1 l4,1z M40,29 l-4,3 l4,-1 l4,1z" fill="${PAL.leafDark}"/>` + hl(28, 22) + hl(20, 34) + hl(36, 36),
  cucumber:
    shade +
    `<rect x="12" y="24" width="40" height="16" rx="8" fill="${PAL.cucumber}" transform="rotate(-25 32 32)"/><rect x="14" y="30" width="38" height="14" rx="7" fill="#62B04A" transform="rotate(-10 32 37)"/>` +
    `<circle cx="22" cy="38" r="1.2" fill="#DFF3C9"/><circle cx="32" cy="36" r="1.2" fill="#DFF3C9"/><circle cx="42" cy="34" r="1.2" fill="#DFF3C9"/>`,
  corn:
    shade +
    `<ellipse cx="32" cy="30" rx="10" ry="22" fill="${PAL.corn}" stroke="#C99A16" stroke-width="1.5"/>` +
    Array.from({ length: 4 }, (_, i) => `<path d="M24,${18 + i * 8} h16" stroke="#E0AE1C" stroke-width="1.2"/>`).join('') +
    `<path d="M32,54 q-16,-8 -14,-30 q8,12 12,28z" fill="${PAL.leaf}"/><path d="M32,54 q16,-8 14,-30 q-8,12 -12,28z" fill="${PAL.leafDark}"/>`,
  strawberry:
    shade +
    `<path d="M14,24 q18,-10 36,0 q-4,26 -18,30 q-14,-4 -18,-30z" fill="${PAL.strawberry}"/>` +
    `<path d="M20,20 l6,-8 l6,6 l6,-6 l6,8 q-12,6 -24,0z" fill="${PAL.leaf}"/>` +
    [[24, 30], [32, 28], [40, 30], [27, 38], [36, 38], [31, 46]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.3" ry="2" fill="#FFE07A"/>`).join('') + hl(22, 28),
  cauliflower:
    shade +
    `<path d="M10,40 q4,-18 22,-14 q18,-4 22,14 q-22,14 -44,0z" fill="${PAL.leaf}"/>` +
    `<circle cx="24" cy="30" r="9" fill="${PAL.cauliflower}"/><circle cx="40" cy="30" r="9" fill="${PAL.cauliflower}"/><circle cx="32" cy="22" r="10" fill="#FFFDF6"/><circle cx="32" cy="33" r="9" fill="#F1EAD6"/>` +
    `<path d="M14,42 q8,-4 14,4 M50,42 q-8,-4 -14,4" stroke="${PAL.leafDark}" stroke-width="3" fill="none"/>`,
  watermelon:
    shade +
    `<ellipse cx="32" cy="36" rx="22" ry="17" fill="${PAL.melon}"/>` +
    [-12, -4, 4, 12].map((d) => `<path d="M${32 + d},20 q${d * 0.4},16 0,32" stroke="${PAL.melonDark}" stroke-width="3" fill="none"/>`).join('') + hl(24, 28, 5),
  egg:
    shade +
    `<ellipse cx="26" cy="36" rx="11" ry="14" fill="${PAL.egg}" stroke="${PAL.eggShade}" stroke-width="1.5"/><ellipse cx="40" cy="38" rx="10" ry="13" fill="#F6DDBA" stroke="${PAL.eggShade}" stroke-width="1.5"/>` +
    hl(22, 30, 3.5) + hl(37, 32, 3),
  wool:
    shade +
    [[22, 34, 11], [36, 30, 12], [44, 40, 9], [30, 42, 10], [20, 44, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#E2DACB" stroke-width="1.5"/>`).join('') +
    `<path d="M26,30 q4,-4 8,0 M34,40 q4,-4 8,0" stroke="#E2DACB" stroke-width="1.5" fill="none"/>`,
  goatmilk:
    shade +
    `<path d="M20,22 h24 l-2,32 h-20z" fill="#F7F2E8" stroke="#BFA88A" stroke-width="2"/><path d="M22,30 h20" stroke="#BFA88A" stroke-width="1.5"/>` +
    `<rect x="18" y="16" width="28" height="7" rx="2" fill="#8B5E3C"/><path d="M26,40 q6,-6 12,0" stroke="#8B5E3C" stroke-width="2" fill="none"/>`,
  milk:
    shade +
    `<path d="M22,18 h20 v8 l4,6 v22 h-28 v-22 l4,-6z" fill="#FFFFFF" stroke="#C8D3DA" stroke-width="2"/>` +
    `<rect x="18" y="34" width="28" height="12" fill="${PAL.btnBlue}"/><rect x="22" y="12" width="20" height="7" rx="2" fill="${PAL.btnBlue}"/>` +
    `<path d="M24,40 q2,-4 5,-1 q3,-3 5,0 q3,-3 5,1" stroke="#fff" stroke-width="1.5" fill="none"/>`,
  olive:
    shade +
    `<path d="M14,22 q18,-10 36,4" stroke="${PAL.trunk}" stroke-width="2.5" fill="none"/>` +
    `<ellipse cx="20" cy="18" rx="8" ry="3" fill="${PAL.olive}" transform="rotate(-20 20 18)"/><ellipse cx="44" cy="20" rx="8" ry="3" fill="${PAL.oliveDark}" transform="rotate(25 44 20)"/>` +
    [[22, 36], [34, 34], [28, 46], [42, 44], [16, 46]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="8" fill="${i % 2 ? '#3E4A22' : PAL.oliveFruit}"/>` + hl(x - 2, y - 3, 2)).join(''),
  orange:
    shade +
    `<circle cx="32" cy="36" r="18" fill="${PAL.orange}"/><circle cx="32" cy="36" r="18" fill="none" stroke="#DD7710" stroke-width="1.5"/>` +
    `<ellipse cx="38" cy="16" rx="9" ry="4" fill="${PAL.leaf}" transform="rotate(-25 38 16)"/><path d="M32,19 v-4" stroke="${PAL.trunk}" stroke-width="2"/>` + hl(25, 29, 5),
  date:
    shade +
    [[22, 36, -15], [32, 32, 5], [42, 38, 20], [28, 46, -5], [38, 48, 10]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="6.5" ry="10" fill="${PAL.date}" transform="rotate(${r} ${x} ${y})"/>` + hl(x - 2, y - 4, 2)).join('') +
    `<path d="M32,8 v18 M32,12 l-10,12 M32,12 l10,12" stroke="#D9A066" stroke-width="2"/>`,
};

export function itemSprite(id: ItemId): SpriteDef {
  return flatSprite(64, 64, ICONS[id]);
}

/** Bubble shown above things in the world: white rounded marker with an inner icon (svg body drawn in 64x64). */
export function bubbleSprite(inner: string, ring = '#FFFFFF'): SpriteDef {
  return flatSprite(
    72,
    84,
    `<path d="M36,82 l-9,-14 h18z" fill="${ring}"/><circle cx="36" cy="36" r="33" fill="${ring}" stroke="rgba(0,0,0,0.12)" stroke-width="2"/><g transform="translate(8,8) scale(0.875)">${inner}</g>`,
    0.5,
    1,
  );
}

export function itemIconBody(id: ItemId): string {
  return ICONS[id];
}
