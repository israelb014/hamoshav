// Inline SVG UI icons (viewBox 0 0 48 48). No emoji anywhere in the UI.
import { PAL } from './palette';

const svg = (body: string, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;

export const ICON = {
  coin: svg(
    `<circle cx="24" cy="25" r="19" fill="${PAL.goldDark}"/><circle cx="24" cy="23" r="19" fill="${PAL.gold}"/><circle cx="24" cy="23" r="13.5" fill="none" stroke="#FFD866" stroke-width="3"/><path d="M24,31 V19 M24,24 q-6,0 -7,-6 q6,0 7,6 M24,22 q5,0 6,-5 q-5,0 -6,5" stroke="${PAL.goldDark}" stroke-width="2.6" fill="${PAL.goldDark}" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="17" cy="14" rx="4" ry="2.4" fill="#fff" opacity="0.6"/>`,
  ),
  diamond: svg(
    `<path d="M10,18 L17,8 H31 L38,18 L24,42z" fill="${PAL.diamondDark}"/><path d="M10,18 H38 L24,42z" fill="${PAL.diamond}"/><path d="M17,8 L20,18 L24,8 L28,18 L31,8" fill="#9BE0FB"/><path d="M20,18 L24,42 L28,18z" fill="#7DD3F8"/><path d="M14,16 l4,-5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  ),
  star: svg(`<path d="M24,4 l6,12.5 13.5,2 -9.8,9.5 2.4,13.5 L24,35 11.9,41.5 14.3,28 4.5,18.5 18,16.5z" fill="#FFC93C" stroke="#E09A10" stroke-width="2" stroke-linejoin="round"/>`),
  farm: svg(
    `<path d="M6,24 L24,8 L42,24" fill="none" stroke="#B04128" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M11,22 V40 H37 V22 L24,11z" fill="#FFF1DC"/><path d="M6,24 L24,8 L42,24 L38,26 L24,14 L10,26z" fill="${PAL.roof}"/><rect x="20" y="28" width="9" height="12" rx="1.5" fill="${PAL.wood}"/><rect x="31" y="26" width="5" height="5" fill="#7FC4E8"/><path d="M2,42 H46" stroke="${PAL.grassDark}" stroke-width="4" stroke-linecap="round"/>`,
  ),
  shop: svg(
    `<rect x="9" y="20" width="30" height="22" rx="2" fill="#FFF1DC"/><rect x="20" y="28" width="9" height="14" fill="${PAL.wood}"/><path d="M5,12 H43 L41,22 H7z" fill="#fff"/><path d="M5,12 H12 L11,22 H7z M19,12 H26 L25.5,22 H19.5z M33,12 H40 L41,22 H35z" fill="${PAL.roof}"/><path d="M5,22 q3.5,4 7,0 q3.5,4 7,0 q3.5,4 7,0 q3.5,4 7,0 q3.5,4 7,0" fill="none" stroke="${PAL.roofDark}" stroke-width="2"/><rect x="5" y="8" width="38" height="5" rx="2" fill="${PAL.roofDark}"/>`,
  ),
  storage: svg(
    `<path d="M6,18 L24,6 L42,18 V42 H6z" fill="${PAL.barnRed}"/><path d="M4,19 L24,5 L44,19" fill="none" stroke="${PAL.barnRedDark}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><rect x="14" y="24" width="20" height="18" fill="#fff"/><rect x="16" y="26" width="16" height="16" fill="${PAL.barnRedDark}"/><path d="M16,26 L32,42 M32,26 L16,42" stroke="#fff" stroke-width="2.5"/><circle cx="24" cy="16" r="3" fill="#fff"/>`,
  ),
  market: svg(
    `<rect x="8" y="22" width="32" height="18" rx="2" fill="${PAL.woodLight}"/><path d="M8,30 H40" stroke="${PAL.woodDark}" stroke-width="2"/><circle cx="16" cy="26" r="4" fill="${PAL.tomato}"/><circle cx="24" cy="25" r="4" fill="${PAL.orange}"/><circle cx="32" cy="26" r="4" fill="${PAL.cucumber}"/><path d="M6,8 H42 L40,18 H8z" fill="#fff"/><path d="M6,8 H14 L13,18 H8z M22,8 H26 V18 H22z M34,8 H42 L40,18 H35z" fill="${PAL.btnGreen}"/><path d="M10,40 V44 M38,40 V44" stroke="${PAL.woodDark}" stroke-width="3"/>`,
  ),
  tasks: svg(
    `<rect x="9" y="7" width="30" height="36" rx="4" fill="#FFF6E5" stroke="${PAL.woodDark}" stroke-width="2.5"/><rect x="17" y="4" width="14" height="7" rx="2" fill="${PAL.woodDark}"/><path d="M14,19 l3,3 l5,-6 M14,29 l3,3 l5,-6" stroke="${PAL.btnGreen}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M25,20 H34 M25,30 H34 M14,38 H34" stroke="${PAL.text}" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>`,
  ),
  edit: svg(
    `<path d="M8,34 L30,12 L36,18 L14,40 H8z" fill="${PAL.btnOrange}"/><path d="M30,12 L34,8 a3,3 0 0 1 4,0 l2,2 a3,3 0 0 1 0,4 L36,18z" fill="${PAL.roof}"/><path d="M8,34 V40 H14z" fill="${PAL.text}"/><path d="M12,32 L30,14" stroke="#fff" stroke-width="2" opacity="0.6"/>`,
  ),
  settings: svg(
    `<path d="M24,4 l4,5 6,-2 1,6 6,2 -2,6 5,4 -5,4 2,6 -6,2 -1,6 -6,-2 -4,5 -4,-5 -6,2 -1,-6 -6,-2 2,-6 -5,-4 5,-4 -2,-6 6,-2 1,-6 6,2z" fill="#8FA3AD" stroke="#62757F" stroke-width="2" stroke-linejoin="round"/><circle cx="24" cy="24" r="7" fill="#FFF6E5" stroke="#62757F" stroke-width="2"/>`,
  ),
  close: svg(`<circle cx="24" cy="24" r="20" fill="#E8574A"/><path d="M16,16 L32,32 M32,16 L16,32" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
  sun: svg(
    `<g stroke="#F7B500" stroke-width="3.5" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<path d="M${24 + Math.cos(a) * 15},${24 + Math.sin(a) * 15} L${24 + Math.cos(a) * 21},${24 + Math.sin(a) * 21}"/>`; }).join('')}</g><circle cx="24" cy="24" r="10" fill="#FFCA28"/><circle cx="21" cy="21" r="3" fill="#fff" opacity="0.5"/>`,
  ),
  cloud: svg(`<circle cx="31" cy="15" r="7" fill="#FFCA28"/><path d="M12,36 a8,8 0 0 1 1,-16 a10,10 0 0 1 19,-2 a8,8 0 0 1 4,18z" fill="#fff" stroke="#B8C7D0" stroke-width="2"/>`),
  rain: svg(
    `<path d="M11,28 a8,8 0 0 1 1,-16 a10,10 0 0 1 19,-2 a8,8 0 0 1 4,18z" fill="#E3EBF0" stroke="#9AAAB4" stroke-width="2"/><path d="M15,33 l-3,7 M24,33 l-3,7 M33,33 l-3,7" stroke="${PAL.waterDark}" stroke-width="3.5" stroke-linecap="round"/>`,
  ),
  heat: svg(
    `<circle cx="24" cy="20" r="11" fill="#FF8A1E"/><g stroke="#FF6A00" stroke-width="3.5" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<path d="M${24 + Math.cos(a) * 15},${20 + Math.sin(a) * 15} L${24 + Math.cos(a) * 19},${20 + Math.sin(a) * 19}"/>`; }).join('')}</g><path d="M8,40 q4,-4 8,0 t8,0 t8,0 t8,0" stroke="#E8574A" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ),
  clock: svg(`<circle cx="24" cy="24" r="18" fill="#fff" stroke="${PAL.text}" stroke-width="3"/><path d="M24,13 V24 L31,28" stroke="${PAL.text}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`),
  lock: svg(`<rect x="11" y="21" width="26" height="20" rx="4" fill="#9A8C7C"/><path d="M16,21 v-5 a8,8 0 0 1 16,0 v5" stroke="#9A8C7C" stroke-width="4.5" fill="none"/><circle cx="24" cy="30" r="3" fill="#5E5246"/><rect x="22.5" y="31" width="3" height="5" fill="#5E5246"/>`),
  drop: svg(`<path d="M24,6 C30,16 36,22 36,30 a12,12 0 0 1 -24,0 C12,22 18,16 24,6z" fill="${PAL.water}" stroke="${PAL.waterDark}" stroke-width="2"/><ellipse cx="19" cy="29" rx="3" ry="5" fill="#fff" opacity="0.5"/>`),
  sick: svg(`<circle cx="24" cy="24" r="19" fill="#fff" stroke="#E8574A" stroke-width="3"/><path d="M24,13 V35 M13,24 H35" stroke="#E8574A" stroke-width="7" stroke-linecap="round"/>`),
  heart: svg(`<path d="M24,41 C10,31 5,24 5,16 a9.5,9.5 0 0 1 19,-3 a9.5,9.5 0 0 1 19,3 C43,24 38,31 24,41z" fill="#F0567A"/><ellipse cx="14" cy="16" rx="3.5" ry="2.5" fill="#fff" opacity="0.5"/>`),
  smile: svg(`<circle cx="24" cy="24" r="19" fill="#FFCA28"/><circle cx="17" cy="20" r="2.6" fill="${PAL.text}"/><circle cx="31" cy="20" r="2.6" fill="${PAL.text}"/><path d="M15,28 q9,9 18,0" stroke="${PAL.text}" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  food: svg(
    [-6, 0, 6].map((d) => `<path d="M24,44 Q${24 + d * 0.4},28 ${24 + d},12" stroke="${PAL.wheatDark}" stroke-width="2.5" fill="none"/><ellipse cx="${24 + d}" cy="12" rx="3.5" ry="8" fill="${PAL.wheat}" stroke="${PAL.wheatDark}" stroke-width="1.2"/>`).join(''),
  ),
  hand: svg(`<path d="M14,26 V14 a3,3 0 0 1 6,0 V24 V10 a3,3 0 0 1 6,0 V24 V12 a3,3 0 0 1 6,0 V26 V18 a3,3 0 0 1 6,0 V30 c0,8 -6,14 -13,14 c-6,0 -9,-3 -12,-8 l-5,-8 a3,3 0 0 1 5,-3z" fill="#F6CBA0" stroke="#C98D5B" stroke-width="2" stroke-linejoin="round"/>`),
  basket: svg(`<path d="M8,20 H40 L36,42 H12z" fill="${PAL.woodLight}" stroke="${PAL.woodDark}" stroke-width="2"/><path d="M14,20 a10,12 0 0 1 20,0" stroke="${PAL.woodDark}" stroke-width="3" fill="none"/><path d="M10,28 H38 M11,35 H37" stroke="${PAL.woodDark}" stroke-width="1.8"/>`),
  bolt: svg(`<path d="M28,4 L10,27 H22 L18,44 L38,19 H26z" fill="#FFCA28" stroke="#E09A10" stroke-width="2" stroke-linejoin="round"/>`),
  plus: svg(`<circle cx="24" cy="24" r="20" fill="${PAL.btnGreen}"/><path d="M24,14 V34 M14,24 H34" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
  minus: svg(`<circle cx="24" cy="24" r="20" fill="${PAL.btnOrange}"/><path d="M14,24 H34" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
  up: svg(`<path d="M24,8 L40,28 H30 V40 H18 V28 H8z" fill="${PAL.btnGreen}"/>`),
  down: svg(`<path d="M24,40 L40,20 H30 V8 H18 V20 H8z" fill="#E8574A"/>`),
  flat: svg(`<path d="M8,24 H40" stroke="#B0A090" stroke-width="6" stroke-linecap="round"/>`),
  check: svg(`<circle cx="24" cy="24" r="20" fill="${PAL.btnGreen}"/><path d="M14,25 l7,7 l13,-15" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  shovel: svg(`<path d="M30,6 L42,18 L38,22 L26,10z" fill="${PAL.wood}"/><path d="M28,16 L14,30" stroke="${PAL.wood}" stroke-width="5" stroke-linecap="round"/><path d="M6,42 L10,26 L18,26 L22,34 L22,38z" fill="${PAL.metal}" stroke="${PAL.metalDark}" stroke-width="2" stroke-linejoin="round"/>`),
  tractor: svg(`<rect x="6" y="20" width="22" height="12" rx="2" fill="#E14B35"/><rect x="20" y="10" width="14" height="14" rx="2" fill="#E14B35"/><rect x="23" y="13" width="8" height="7" fill="#A9DDF5"/><circle cx="31" cy="34" r="9" fill="#2E2A28"/><circle cx="31" cy="34" r="4" fill="#F2B632"/><circle cx="11" cy="36" r="6" fill="#2E2A28"/><circle cx="11" cy="36" r="2.5" fill="#F2B632"/>`),
  sound: svg(`<path d="M8,18 H16 L26,9 V39 L16,30 H8z" fill="${PAL.text}"/><path d="M31,17 q5,7 0,14 M36,12 q9,12 0,24" stroke="${PAL.text}" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  download: svg(`<path d="M24,6 V30 M14,20 L24,30 L34,20" stroke="${PAL.btnBlue}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8,34 V42 H40 V34" stroke="${PAL.text}" stroke-width="4" fill="none" stroke-linecap="round"/>`),
  upload: svg(`<path d="M24,30 V6 M14,16 L24,6 L34,16" stroke="${PAL.btnGreen}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M8,34 V42 H40 V34" stroke="${PAL.text}" stroke-width="4" fill="none" stroke-linecap="round"/>`),
  reset: svg(`<path d="M38,24 a14,14 0 1 1 -4,-10" stroke="#E8574A" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M36,4 V16 H24" stroke="#E8574A" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  baby: svg(`<circle cx="24" cy="26" r="15" fill="#FFE07A"/><path d="M14,24 a10,10 0 0 1 20,0" fill="#FFD040"/><circle cx="19" cy="25" r="2" fill="${PAL.text}"/><circle cx="29" cy="25" r="2" fill="${PAL.text}"/><path d="M22,30 l2,3 l2,-3z" fill="#F39A2B"/><path d="M22,10 q2,-5 4,0" stroke="#F39A2B" stroke-width="2.5" fill="none"/>`),
  wilt: svg(`<path d="M24,44 V24 q0,-8 -8,-12 M24,28 q4,-6 12,-6 M24,34 q-6,-2 -10,2" stroke="${PAL.withered}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`),
  gift: svg(`<rect x="8" y="20" width="32" height="22" rx="3" fill="${PAL.btnOrange}"/><rect x="6" y="14" width="36" height="8" rx="2" fill="${PAL.roof}"/><path d="M24,14 V42" stroke="#FFE07A" stroke-width="5"/><path d="M24,14 q-10,-12 -12,-2 q2,4 12,2 q10,2 12,-2 q-2,-10 -12,2" fill="none" stroke="#FFE07A" stroke-width="3"/>`),
} as const;

export type IconName = keyof typeof ICON;

export function icon(name: IconName, cls = ''): string {
  return cls ? ICON[name].replace('class="ic ', `class="ic ${cls} `) : ICON[name];
}
