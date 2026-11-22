import { PAL } from './palette';
import { flatSprite, type SpriteDef } from './iso';
import type { AnimalId } from '../sim/data';

// Animals are drawn facing left in a 64 x 56 box, feet near y = 50.
const SH = `<ellipse cx="32" cy="51" rx="18" ry="4.5" fill="rgba(70,40,15,0.25)"/>`;

function chicken(): string {
  return (
    SH +
    `<path d="M40,30 q10,-14 6,-18 q-4,6 -10,8z" fill="#F2E6D0" stroke="#D9C7A8" stroke-width="1"/>` + // tail
    `<ellipse cx="33" cy="34" rx="14" ry="11" fill="#FFFFFF" stroke="#E2D6C2" stroke-width="1.2"/>` +
    `<path d="M30,32 q6,6 12,0" stroke="#E2D6C2" stroke-width="1.5" fill="none"/>` +
    `<circle cx="22" cy="22" r="7.5" fill="#FFFFFF" stroke="#E2D6C2" stroke-width="1.2"/>` +
    `<path d="M18,15 q2,-5 4,-1 q2,-5 4,0 q2,-3 2,2z" fill="${PAL.tomato}"/>` + // comb
    `<path d="M14,22 l-5,2 l5,2z" fill="#F5A623"/>` + // beak
    `<ellipse cx="16.5" cy="27" rx="2" ry="3" fill="${PAL.tomato}"/>` + // wattle
    `<circle cx="20" cy="21" r="1.4" fill="${PAL.black}"/>` +
    `<path d="M30,44 v6 M36,44 v6 M28,50 h4 M34,50 h4" stroke="#E8A13A" stroke-width="2" stroke-linecap="round"/>`
  );
}

function sheep(): string {
  let wool = '';
  for (const [x, y, r] of [[28, 30, 9], [38, 28, 9], [46, 32, 8], [32, 38, 9], [42, 38, 9], [24, 36, 7]] as const)
    wool += `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" stroke="#E6E0D6" stroke-width="1"/>`;
  return (
    SH +
    `<path d="M28,42 v8 M34,43 v8 M42,43 v8 M47,42 v8" stroke="#3B302A" stroke-width="3" stroke-linecap="round"/>` +
    wool +
    `<ellipse cx="15" cy="30" rx="7" ry="8.5" fill="#3B302A"/>` +
    `<ellipse cx="18" cy="23" rx="5" ry="2.6" fill="#3B302A" transform="rotate(-20 18 23)"/>` +
    `<circle cx="13" cy="28" r="1.4" fill="#fff"/>` +
    `<circle cx="22" cy="23" r="5" fill="#FFFFFF" stroke="#E6E0D6" stroke-width="1"/>`
  );
}

function goat(): string {
  return (
    SH +
    `<path d="M26,40 v10 M31,41 v10 M42,41 v10 M47,40 v10" stroke="#6A4A32" stroke-width="3" stroke-linecap="round"/>` +
    `<ellipse cx="37" cy="33" rx="15" ry="9.5" fill="#E9DCC8" stroke="#BFA88A" stroke-width="1.2"/>` +
    `<path d="M40,26 q8,2 11,8 q-6,1 -9,-2z" fill="#8B5E3C"/>` +
    `<path d="M51,28 l5,-4" stroke="#BFA88A" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M24,30 l-4,-10" stroke="#E9DCC8" stroke-width="7" stroke-linecap="round"/>` +
    `<ellipse cx="16" cy="20" rx="6.5" ry="5.5" fill="#E9DCC8" stroke="#BFA88A" stroke-width="1.2"/>` +
    `<path d="M18,15 q2,-7 8,-8 M15,15 q0,-6 4,-9" stroke="#8C7A66" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="22" cy="18" rx="4" ry="1.8" fill="#D9C7AC" transform="rotate(25 22 18)"/>` +
    `<path d="M11,24 q0,6 3,6" stroke="#BFA88A" stroke-width="2" fill="none"/>` +
    `<circle cx="14" cy="19" r="1.3" fill="${PAL.black}"/>`
  );
}

function cow(): string {
  return (
    SH +
    `<path d="M24,40 v10 M30,41 v10 M44,41 v10 M50,40 v10" stroke="#5A4A40" stroke-width="3.5" stroke-linecap="round"/>` +
    `<rect x="20" y="22" width="36" height="21" rx="10" fill="#FFFFFF" stroke="#D8D0C4" stroke-width="1.2"/>` +
    `<path d="M30,22 q6,6 2,12 q-6,0 -8,-6 q2,-5 6,-6z M44,26 q6,-2 8,4 q-2,6 -8,4z M38,36 q4,0 4,5 h-7z" fill="${PAL.black}"/>` +
    `<ellipse cx="38" cy="43" rx="5" ry="2.5" fill="${PAL.pink}"/>` +
    `<path d="M56,26 q5,6 3,14" stroke="#D8D0C4" stroke-width="2" fill="none"/>` +
    `<ellipse cx="15" cy="25" rx="8" ry="9" fill="#FFFFFF" stroke="#D8D0C4" stroke-width="1.2"/>` +
    `<ellipse cx="11" cy="31" rx="6" ry="4.5" fill="${PAL.pink}"/>` +
    `<circle cx="9" cy="31" r="1" fill="#B9707A"/><circle cx="13" cy="31.5" r="1" fill="#B9707A"/>` +
    `<path d="M10,16 q-2,-4 -5,-4 M20,16 q2,-4 5,-4" stroke="#E9DCC0" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="23" cy="20" rx="4.5" ry="2.2" fill="${PAL.black}" transform="rotate(25 23 20)"/>` +
    `<circle cx="13" cy="22" r="1.5" fill="${PAL.black}"/><circle cx="18" cy="22" r="1.5" fill="${PAL.black}"/>`
  );
}

export function animalSprite(id: AnimalId): SpriteDef {
  const body = id === 'chicken' ? chicken() : id === 'sheep' ? sheep() : id === 'goat' ? goat() : cow();
  return flatSprite(64, 56, body, 0.5, 0.9);
}
