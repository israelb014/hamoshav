import { PAL } from './palette';
import { P, box, fenceLine, isoSprite, leftFaceRect, poly, quad, rightFaceRect, roofX, roofY, shadow, type SpriteDef } from './iso';
import type { StructureKind } from '../sim/data';

const FENCE = { post: PAL.woodLight, rail: PAL.wood, dark: PAL.woodDeep };

function yard(m = 0.98, color: string = PAL.path): string {
  let s = quad(-m, -m, m, m, 0, color);
  s += quad(-m + 0.08, -m + 0.08, m - 0.08, m - 0.08, 0, PAL.pathLight, 'opacity="0.35"');
  return s;
}
function hay(x: number, y: number): string {
  return `<ellipse cx="${x}" cy="${y}" rx="9" ry="5" fill="${PAL.wheat}"/><path d="M${x - 7},${y - 1} l4,-3 M${x - 2},${y} l3,-4 M${x + 3},${y - 1} l3,-3" stroke="${PAL.wheatDark}" stroke-width="1.2"/>`;
}
function backFence(m = 0.96): string {
  return fenceLine([-m, -m], [m, -m], 4, FENCE) + fenceLine([-m, -m], [-m, m], 4, FENCE);
}
function frontFence(m = 0.96, gate = true): string {
  let s = fenceLine([-m, m], [m, m], 4, FENCE);
  s += gate ? fenceLine([m, -m], [m, -0.15], 2, FENCE) + fenceLine([m, 0.35], [m, m], 1, FENCE) : fenceLine([m, -m], [m, m], 4, FENCE);
  return s;
}

function windowL(x0: number, x1: number, y: number, u0: number, u1: number, z0: number, z1: number): string {
  return leftFaceRect(x0, x1, y, u0 - 0.02, u1 + 0.02, z0 - 2, z1 + 2, PAL.wallDark) + leftFaceRect(x0, x1, y, u0, u1, z0, z1, '#7FC4E8') + leftFaceRect(x0, x1, y, u0, (u0 + u1) / 2 - 0.01, z0, z1, '#A6DBF3');
}
function windowR(y0: number, y1: number, x: number, u0: number, u1: number, z0: number, z1: number): string {
  return rightFaceRect(y0, y1, x, u0 - 0.02, u1 + 0.02, z0 - 2, z1 + 2, PAL.wallDark) + rightFaceRect(y0, y1, x, u0, u1, z0, z1, '#6AB2D8');
}

function house(): string {
  let s = yard(0.98, PAL.grassDark);
  s += quad(-0.98, 0.45, 0.98, 0.98, 0, PAL.path);
  s += shadow(P(0.1, 0.1)[0], P(0.1, 0.1)[1] + 6, 100, 42);
  const x0 = -0.75, x1 = 0.55, y0 = -0.75, y1 = 0.35, h = 50;
  s += box(x0, y0, x1, y1, 0, h, { top: PAL.wall, left: PAL.wall, right: PAL.wallShade });
  // base stripe
  s += leftFaceRect(x0, x1, y1, 0, 1, 0, 6, PAL.wallDark) + rightFaceRect(y0, y1, x1, 0, 1, 0, 6, '#C4A57B');
  // door + windows
  s += leftFaceRect(x0, x1, y1, 0.42, 0.6, 0, 32, PAL.woodDark) + leftFaceRect(x0, x1, y1, 0.44, 0.58, 2, 30, PAL.wood);
  s += windowL(x0, x1, y1, 0.1, 0.3, 18, 36) + windowL(x0, x1, y1, 0.72, 0.9, 18, 36);
  s += windowR(y0, y1, x1, 0.25, 0.7, 18, 36);
  // chimney
  s += box(-0.45, -0.45, -0.3, -0.3, h + 10, 30, { top: '#B04A33', left: '#C8553A', right: '#9C3F2C' });
  s += roofX(x0, y0, x1, y1, h, 34, 0.1, { front: PAL.roof, back: PAL.roofDark, gable: PAL.wallShade, ridge: PAL.roofDark });
  // roof tiles lines
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    const a = P(x0 - 0.1 + (x1 - x0 + 0.2) * t, 0.45, h - 4), b = P(x0 - 0.1 + (x1 - x0 + 0.2) * t, -0.2, h + 34);
    s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${PAL.roofLight}" stroke-width="2" opacity="0.5"/>`;
  }
  // step + bushes + pot
  s += box(-0.18, 0.35, 0.02, 0.5, 0, 4, { top: '#E5CFAE', left: '#CDB28A', right: '#BBA07A' });
  const bush = (gx: number, gy: number, r: number) => {
    const [x, y] = P(gx, gy);
    return `<circle cx="${x}" cy="${y - r}" r="${r}" fill="${PAL.leafDark}"/><circle cx="${x - r * 0.3}" cy="${y - r * 1.3}" r="${r * 0.7}" fill="${PAL.leaf}"/><circle cx="${x + r * 0.2}" cy="${y - r * 1.5}" r="${r * 0.35}" fill="${PAL.flowerPink}"/>`;
  };
  s += bush(0.75, 0.6, 10) + bush(-0.8, 0.6, 9);
  return s;
}

function coopShed(x0: number, y0: number, x1: number, y1: number, h: number, wall: string, wallR: string, roof: [string, string]): string {
  let s = box(x0, y0, x1, y1, 0, h, { top: wall, left: wall, right: wallR });
  // planks
  for (let i = 1; i < 6; i++) s += leftFaceRect(x0, x1, y1, i / 6, i / 6 + 0.01, 0, h, 'rgba(0,0,0,0.12)');
  s += leftFaceRect(x0, x1, y1, 0.35, 0.65, 0, h * 0.55, PAL.woodDeep);
  // ramp
  s += poly([P(x0 + (x1 - x0) * 0.38, y1, 0), P(x0 + (x1 - x0) * 0.62, y1, 0), P(x0 + (x1 - x0) * 0.62, y1 + 0.3, 0), P(x0 + (x1 - x0) * 0.38, y1 + 0.3, 0)], PAL.woodLight);
  s += rightFaceRect(y0, y1, x1, 0.3, 0.7, h * 0.45, h * 0.8, '#3A2A1E');
  s += roofX(x0, y0, x1, y1, h, 22, 0.08, { front: roof[0], back: roof[1], gable: wallR, ridge: roof[1] });
  return s;
}

function coop(big: boolean): string {
  let s = yard();
  s += backFence();
  s += big
    ? coopShed(-0.9, -0.9, 0.35, -0.2, 40, PAL.barnRed, PAL.barnRedDark, [PAL.wall, PAL.wallDark])
    : coopShed(-0.9, -0.9, -0.05, -0.25, 32, PAL.wood, PAL.woodDark, [PAL.roof, PAL.roofDark]);
  s += hay(...P(0.55, -0.6)) + `<g>${(() => { const [x, y] = P(0.5, 0.5); return `<ellipse cx="${x}" cy="${y}" rx="14" ry="5" fill="${PAL.woodDark}"/><ellipse cx="${x}" cy="${y - 2}" rx="11" ry="3.5" fill="${PAL.wheat}"/>`; })()}</g>`;
  s += frontFence();
  return s;
}

function pen(): string {
  let s = yard(0.98, '#C9A36A');
  s += backFence();
  const x0 = -0.9, y0 = -0.9, x1 = 0.1, y1 = -0.15, h = 38;
  s += box(x0, y0, x1, y1, 0, h, { top: PAL.woodLight, left: PAL.woodLight, right: PAL.wood });
  for (let i = 1; i < 7; i++) s += leftFaceRect(x0, x1, y1, i / 7, i / 7 + 0.01, 0, h, 'rgba(0,0,0,0.13)');
  s += leftFaceRect(x0, x1, y1, 0.3, 0.7, 0, h * 0.7, PAL.woodDeep);
  s += roofY(x0, y0, x1, y1, h, 22, 0.08, { front: '#8E9AA0', back: '#6D7A80', gable: PAL.wood, ridge: '#5D686D' });
  s += hay(...P(0.55, -0.55)) + hay(...P(0.65, -0.3));
  s += frontFence();
  return s;
}

function barn(): string {
  let s = yard(0.98, '#C9A36A');
  s += shadow(...P(-0.1, -0.1), 100, 40);
  const x0 = -0.92, y0 = -0.92, x1 = 0.45, y1 = 0.3, h = 58;
  s += box(x0, y0, x1, y1, 0, h, { top: PAL.barnRed, left: PAL.barnRed, right: PAL.barnRedDark });
  // big door with white X on left face
  const d0 = 0.3, d1 = 0.72;
  s += leftFaceRect(x0, x1, y1, d0 - 0.03, d1 + 0.03, 0, 44, '#FFFFFF');
  s += leftFaceRect(x0, x1, y1, d0, d1, 0, 41, '#8E2E20');
  const A = P(x0 + (x1 - x0) * d0, y1, 0), B = P(x0 + (x1 - x0) * d1, y1, 0), C = P(x0 + (x1 - x0) * d1, y1, 41), D = P(x0 + (x1 - x0) * d0, y1, 41);
  s += `<path d="M${A[0]},${A[1]} L${C[0]},${C[1]} M${B[0]},${B[1]} L${D[0]},${D[1]}" stroke="#fff" stroke-width="3"/>`;
  s += windowR(y0, y1, x1, 0.35, 0.65, 34, 48);
  s += leftFaceRect(x0, x1, y1, 0, 1, h - 4, h, '#FFFFFF');
  s += roofX(x0, y0, x1, y1, h, 40, 0.1, { front: '#7D8A90', back: '#5F6B70', gable: PAL.barnRedDark, ridge: '#4E585C' });
  s += hay(...P(0.75, -0.6)) + hay(...P(0.75, -0.3));
  s += fenceLine([0.96, -0.96], [0.96, 0.96], 4, FENCE) + fenceLine([-0.96, 0.96], [0.96, 0.96], 4, FENCE);
  return s;
}

function greenhouse(): string {
  let s = yard(0.98, PAL.path);
  const x0 = -0.85, y0 = -0.85, x1 = 0.85, y1 = 0.85, h = 40;
  // floor beds
  s += quad(x0 + 0.1, y0 + 0.1, x1 - 0.1, y1 - 0.1, 1, PAL.soilDark);
  for (const [gx, gy] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
    const [x, y] = P(gx, gy, 2);
    s += `<circle cx="${x - 6}" cy="${y - 6}" r="7" fill="${PAL.leaf}"/><circle cx="${x + 5}" cy="${y - 5}" r="6" fill="${PAL.leafDark}"/><circle cx="${x}" cy="${y - 11}" r="6" fill="${PAL.leafLight}"/>`;
  }
  const glass = { top: 'rgba(205,239,250,0.55)', left: 'rgba(205,239,250,0.45)', right: 'rgba(147,207,230,0.55)' };
  s += box(x0, y0, x1, y1, 0, h, glass);
  // frame lines
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const a = P(x0 + (x1 - x0) * t, y1, 0), b = P(x0 + (x1 - x0) * t, y1, h);
    s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#F7FBFC" stroke-width="2.5"/>`;
    const c = P(x1, y0 + (y1 - y0) * t, 0), d = P(x1, y0 + (y1 - y0) * t, h);
    s += `<line x1="${c[0]}" y1="${c[1]}" x2="${d[0]}" y2="${d[1]}" stroke="#EAF4F7" stroke-width="2.5"/>`;
  }
  s += roofX(x0, y0, x1, y1, h, 30, 0.04, { front: 'rgba(225,246,253,0.7)', back: 'rgba(170,215,232,0.7)', gable: 'rgba(205,239,250,0.6)', ridge: '#F7FBFC' });
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const a = P(x0 + (x1 - x0) * t, y1 + 0.04, h - 4), b = P(x0 + (x1 - x0) * t, 0, h + 30);
    s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#F7FBFC" stroke-width="2"/>`;
  }
  // shine
  const sh = P(-0.4, y1, 28);
  s += `<path d="M${sh[0]},${sh[1]} l18,9 l0,-10 l-18,-9z" fill="#fff" opacity="0.45"/>`;
  return s;
}

function pump(): string {
  let s = shadow(0, 6, 40, 16);
  // trough
  s += box(-0.35, -0.05, 0.35, 0.3, 0, 12, { top: PAL.woodLight, left: PAL.wood, right: PAL.woodDark });
  s += quad(-0.3, 0, 0.3, 0.25, 12.5, PAL.water);
  s += quad(-0.25, 0.02, 0.0, 0.12, 13, '#A9DDF5');
  // pump column
  s += box(-0.12, -0.32, 0.06, -0.14, 0, 46, { top: PAL.pumpBlue, left: PAL.pumpBlue, right: PAL.pumpBlueDark });
  s += box(-0.16, -0.36, 0.1, -0.1, 46, 6, { top: '#5AA7E0', left: PAL.pumpBlue, right: PAL.pumpBlueDark });
  const sp = P(-0.03, -0.14, 34);
  s += `<path d="M${sp[0]},${sp[1]} q8,4 8,12" stroke="${PAL.metalDark}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  const hd = P(-0.03, -0.23, 50);
  s += `<path d="M${hd[0]},${hd[1]} l-22,-14" stroke="${PAL.metalDark}" stroke-width="4" stroke-linecap="round"/><circle cx="${hd[0] - 22}" cy="${hd[1] - 14}" r="4" fill="${PAL.metal}"/>`;
  const dr = P(0.0, 0.1, 13);
  s += `<path d="M${dr[0] + 8},${dr[1] - 8} q2,4 0,6 q-2,-2 0,-6z" fill="${PAL.water}"/>`;
  return s;
}

function tractor(): string {
  let s = shadow(0, 6, 48, 18);
  const wheel = (gx: number, gy: number, z: number, r: number) => {
    const [x, y] = P(gx, gy, z);
    return `<ellipse cx="${x}" cy="${y}" rx="${r * 0.62}" ry="${r}" fill="#2E2A28"/><ellipse cx="${x + 1.5}" cy="${y}" rx="${r * 0.38}" ry="${r * 0.62}" fill="#F2B632"/><circle cx="${x + 1.5}" cy="${y}" r="${r * 0.18}" fill="#8A6A1A"/>`;
  };
  // far wheels
  s += wheel(-0.25, -0.3, 18, 18) + wheel(0.35, -0.25, 10, 10);
  // body (hood along +x)
  s += box(-0.25, -0.2, 0.42, 0.12, 8, 18, { top: '#E14B35', left: '#D23A26', right: '#B32E1D' });
  s += box(0.38, -0.18, 0.45, 0.1, 10, 12, { top: '#888', left: '#777', right: '#555' });
  // cabin
  s += box(-0.32, -0.24, 0.02, 0.16, 18, 30, { top: '#E14B35', left: 'rgba(160,215,240,0.9)', right: 'rgba(120,190,225,0.9)' });
  s += box(-0.36, -0.28, 0.06, 0.2, 48, 4, { top: '#E8E8E8', left: '#CFCFCF', right: '#B8B8B8' });
  // exhaust
  const ex = P(0.25, -0.1, 26);
  s += `<rect x="${ex[0] - 2}" y="${ex[1] - 16}" width="4" height="16" fill="#444"/>`;
  // near wheels
  s += wheel(-0.25, 0.22, 18, 19) + wheel(0.38, 0.18, 10, 11);
  return s;
}

export function structureSprite(kind: StructureKind): SpriteDef {
  switch (kind) {
    case 'house':
      return isoSprite(2, 110, house());
    case 'coop':
      return isoSprite(2, 70, coop(false));
    case 'bigcoop':
      return isoSprite(2, 80, coop(true));
    case 'pen':
      return isoSprite(2, 80, pen());
    case 'barn':
      return isoSprite(2, 120, barn());
    case 'greenhouse':
      return isoSprite(2, 90, greenhouse());
    case 'pump':
      return isoSprite(1, 70, pump());
    case 'tractor':
      return isoSprite(1, 70, tractor());
  }
}
