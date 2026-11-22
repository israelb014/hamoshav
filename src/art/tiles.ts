import { PAL } from './palette';
import { P, artRand, fenceLine, flatSprite, isoSprite, poly, pts, quad, type SpriteDef } from './iso';
import type { Season } from '../sim/data';

const GRASS: Record<Season, { base: string; light: string; dark: string }> = {
  spring: { base: PAL.grass, light: PAL.grassLight, dark: PAL.grassDark },
  summer: { base: '#B2C63E', light: '#C9D85A', dark: '#93A830' },
  autumn: { base: '#A4BD3F', light: '#BCD158', dark: '#87A132' },
  winter: { base: '#86B848', light: '#9DCB5C', dark: '#6C9C38' },
};

function tuft(x: number, y: number, c: string): string {
  return `<path d="M${x - 3},${y} q1,-5 2,-7 M${x},${y} q0,-6 0,-9 M${x + 3},${y} q-1,-5 -2,-7" stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
}

function flower(x: number, y: number, c: string): string {
  return `<g><circle cx="${x - 2}" cy="${y}" r="1.8" fill="${c}"/><circle cx="${x + 2}" cy="${y}" r="1.8" fill="${c}"/><circle cx="${x}" cy="${y - 2}" r="1.8" fill="${c}"/><circle cx="${x}" cy="${y + 2}" r="1.8" fill="${c}"/><circle cx="${x}" cy="${y}" r="1.4" fill="${PAL.flowerYellow}"/></g>`;
}

/** Random point inside the unit diamond (relative to tile centre). */
function inDiamond(r: () => number, m = 0.8): [number, number] {
  const u = (r() - 0.5) * m, v = (r() - 0.5) * m;
  return P(u, v);
}

export function grassTile(season: Season, variant: number): SpriteDef {
  const g = GRASS[season];
  const r = artRand(variant * 97 + season.length * 13);
  let b = quad(-0.5, -0.5, 0.5, 0.5, 0, g.base);
  // soft lighter patches
  for (let i = 0; i < 3; i++) {
    const [x, y] = inDiamond(r, 0.6);
    b += `<ellipse cx="${x}" cy="${y}" rx="${10 + r() * 10}" ry="${5 + r() * 4}" fill="${g.light}" opacity="0.55"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const [x, y] = inDiamond(r);
    b += tuft(x, y + 3, g.dark);
  }
  if (season === 'spring') {
    const cols = [PAL.flowerWhite, PAL.flowerPink, PAL.flowerYellow, PAL.flowerRed];
    for (let i = 0; i < 3 + (variant % 2); i++) {
      const [x, y] = inDiamond(r, 0.7);
      b += flower(x, y, cols[Math.floor(r() * cols.length)]);
    }
  }
  if (season === 'autumn') {
    for (let i = 0; i < 3; i++) {
      const [x, y] = inDiamond(r, 0.7);
      b += `<ellipse cx="${x}" cy="${y}" rx="3" ry="1.8" fill="${i % 2 ? '#D9822B' : '#C4552B'}" transform="rotate(${r() * 180} ${x} ${y})"/>`;
    }
  }
  // subtle edge to read the grid
  b += `<polygon points="${pts([P(-0.5, -0.5), P(0.5, -0.5), P(0.5, 0.5), P(-0.5, 0.5)])}" fill="none" stroke="${g.dark}" stroke-opacity="0.18" stroke-width="1"/>`;
  return isoSprite(1, 0, b);
}

export function pathTile(): SpriteDef {
  const r = artRand(5);
  let b = quad(-0.5, -0.5, 0.5, 0.5, 0, PAL.path);
  for (let i = 0; i < 7; i++) {
    const [x, y] = inDiamond(r);
    b += `<ellipse cx="${x}" cy="${y}" rx="${2 + r() * 2}" ry="${1.2 + r()}" fill="${i % 2 ? PAL.pathDark : PAL.pathLight}"/>`;
  }
  return isoSprite(1, 0, b);
}

export function plotTile(wet: boolean): SpriteDef {
  const top = wet ? PAL.soilWet : PAL.soil;
  const dark = wet ? PAL.soilWetDark : PAL.soilDark;
  const light = wet ? PAL.soilWetLight : PAL.soilLight;
  const m = 0.44, h = 7;
  let b = '';
  // raised bed sides
  b += poly([P(-m, m, 0), P(m, m, 0), P(m, m, h), P(-m, m, h)], dark);
  b += poly([P(m, -m, 0), P(m, m, 0), P(m, m, h), P(m, -m, h)], PAL.soilEdge);
  b += quad(-m, -m, m, m, h, top);
  // furrows along x
  for (let i = 0; i < 4; i++) {
    const y = -m + 0.11 + i * 0.22;
    const a = P(-m + 0.06, y, h), c = P(m - 0.06, y, h);
    b += `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>`;
    b += `<line x1="${a[0]}" y1="${a[1] - 2.5}" x2="${c[0]}" y2="${c[1] - 2.5}" stroke="${light}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
  }
  if (wet) {
    const [x, y] = P(0.15, -0.1, h);
    b += `<ellipse cx="${x}" cy="${y}" rx="9" ry="3" fill="#ffffff" opacity="0.18"/>`;
  }
  return isoSprite(1, 8, b);
}

export function fenceSprite(axis: 'x' | 'y'): SpriteDef {
  const c = { post: PAL.woodLight, rail: PAL.wood, dark: PAL.woodDeep };
  // fence along the "far" edge of a tile so it can be placed on the boundary
  const body = axis === 'x' ? fenceLine([-0.5, 0.5], [0.5, 0.5], 2, c) : fenceLine([0.5, -0.5], [0.5, 0.5], 2, c);
  return isoSprite(1, 26, body);
}

export function puddle(): SpriteDef {
  return flatSprite(
    60,
    26,
    `<ellipse cx="30" cy="13" rx="27" ry="10" fill="${PAL.waterDark}" opacity="0.55"/><ellipse cx="26" cy="11" rx="16" ry="5" fill="#ffffff" opacity="0.35"/>`,
  );
}

export function cloud(): SpriteDef {
  return flatSprite(
    240,
    120,
    `<g opacity="0.92"><ellipse cx="120" cy="78" rx="100" ry="30" fill="#ffffff"/><circle cx="80" cy="62" r="34" fill="#ffffff"/><circle cx="130" cy="48" r="44" fill="#ffffff"/><circle cx="176" cy="68" r="28" fill="#ffffff"/><ellipse cx="120" cy="96" rx="90" ry="14" fill="#E3EEF5"/></g>`,
  );
}

export function rainDrop(): SpriteDef {
  return flatSprite(6, 22, `<rect x="1.5" y="0" width="3" height="22" rx="1.5" fill="#CFE9FA" opacity="0.85"/>`);
}

export function sparkle(): SpriteDef {
  return flatSprite(24, 24, `<path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" fill="#FFF7C2"/>`);
}

export function selection(n: number, ok: boolean): SpriteDef {
  const c = ok ? '#7CFC6A' : '#FF5A4A';
  return isoSprite(n, 0, poly([P(-n / 2, -n / 2), P(n / 2, -n / 2), P(n / 2, n / 2), P(-n / 2, n / 2)], c, `fill-opacity="0.35" stroke="${c}" stroke-width="4"`));
}
