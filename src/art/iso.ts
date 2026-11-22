// Isometric SVG drawing helpers. Grid units: 1 tile = 128 x 64 px (2:1 iso).
export type Pt = [number, number];

export const TW = 128;
export const TH = 64;

/** Project grid coords (tiles, relative to footprint centre) + height (px) to screen. */
export const P = (gx: number, gy: number, z = 0): Pt => [(gx - gy) * (TW / 2), (gx + gy) * (TH / 2) - z];

const f = (n: number) => (Math.round(n * 10) / 10).toString();
export const pts = (p: Pt[]) => p.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

export function poly(p: Pt[], fill: string, extra = ''): string {
  return `<polygon points="${pts(p)}" fill="${fill}" ${extra}/>`;
}

/** Ground quad x0..x1, y0..y1 at height z. */
export function quad(x0: number, y0: number, x1: number, y1: number, z: number, fill: string, extra = ''): string {
  return poly([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], fill, extra);
}

export interface BoxColors {
  top: string;
  left: string; // face toward +y (front-left)
  right: string; // face toward +x (front-right)
  stroke?: string;
}

/** Axis-aligned iso box. */
export function box(x0: number, y0: number, x1: number, y1: number, z0: number, h: number, c: BoxColors): string {
  const st = c.stroke ? `stroke="${c.stroke}" stroke-width="1.5" stroke-linejoin="round"` : '';
  return (
    poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z0 + h), P(x0, y1, z0 + h)], c.left, st) +
    poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z0 + h), P(x1, y0, z0 + h)], c.right, st) +
    poly([P(x0, y0, z0 + h), P(x1, y0, z0 + h), P(x1, y1, z0 + h), P(x0, y1, z0 + h)], c.top, st)
  );
}

export interface RoofColors {
  front: string;
  back: string;
  gable: string;
  ridge?: string;
}

/** Gable roof whose ridge runs along the x axis. Walls are x0..x1, y0..y1, top at z. */
export function roofX(x0: number, y0: number, x1: number, y1: number, z: number, rh: number, o: number, c: RoofColors): string {
  const ym = (y0 + y1) / 2;
  const X0 = x0 - o, X1 = x1 + o, Y0 = y0 - o, Y1 = y1 + o;
  let s = '';
  s += poly([P(X0, Y0, z - 4), P(X1, Y0, z - 4), P(X1, ym, z + rh), P(X0, ym, z + rh)], c.back);
  s += poly([P(X0, Y1, z - 4), P(X1, Y1, z - 4), P(X1, ym, z + rh), P(X0, ym, z + rh)], c.front);
  s += poly([P(x1 + o * 0.5, y0, z), P(x1 + o * 0.5, y1, z), P(x1 + o * 0.5, ym, z + rh - 2)], c.gable);
  // gable edge trim
  s += `<polyline points="${pts([P(X1, Y1, z - 4), P(X1, ym, z + rh), P(X1, Y0, z - 4)])}" fill="none" stroke="${c.ridge ?? c.back}" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<line x1="${f(P(X0, ym, z + rh)[0])}" y1="${f(P(X0, ym, z + rh)[1])}" x2="${f(P(X1, ym, z + rh)[0])}" y2="${f(P(X1, ym, z + rh)[1])}" stroke="${c.ridge ?? c.back}" stroke-width="4" stroke-linecap="round"/>`;
  return s;
}

/** Gable roof whose ridge runs along the y axis. */
export function roofY(x0: number, y0: number, x1: number, y1: number, z: number, rh: number, o: number, c: RoofColors): string {
  const xm = (x0 + x1) / 2;
  const X0 = x0 - o, X1 = x1 + o, Y0 = y0 - o, Y1 = y1 + o;
  let s = '';
  s += poly([P(X0, Y0, z - 4), P(X0, Y1, z - 4), P(xm, Y1, z + rh), P(xm, Y0, z + rh)], c.back);
  s += poly([P(X1, Y0, z - 4), P(X1, Y1, z - 4), P(xm, Y1, z + rh), P(xm, Y0, z + rh)], c.front);
  s += poly([P(x0, y1 + o * 0.5, z), P(x1, y1 + o * 0.5, z), P(xm, y1 + o * 0.5, z + rh - 2)], c.gable);
  s += `<polyline points="${pts([P(X0, Y1, z - 4), P(xm, Y1, z + rh), P(X1, Y1, z - 4)])}" fill="none" stroke="${c.ridge ?? c.back}" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<line x1="${f(P(xm, Y0, z + rh)[0])}" y1="${f(P(xm, Y0, z + rh)[1])}" x2="${f(P(xm, Y1, z + rh)[0])}" y2="${f(P(xm, Y1, z + rh)[1])}" stroke="${c.ridge ?? c.back}" stroke-width="4" stroke-linecap="round"/>`;
  return s;
}

export function shadow(cx: number, cy: number, rx: number, ry: number, op = 0.22): string {
  return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="rgba(70,40,15,${op})"/>`;
}

/** Window / door on the +y (left) face: u along x (0..1 of x0..x1), v height. */
export function leftFaceRect(x0: number, x1: number, y: number, u0: number, u1: number, z0: number, z1: number, fill: string, extra = ''): string {
  const a = x0 + (x1 - x0) * u0, b = x0 + (x1 - x0) * u1;
  return poly([P(a, y, z0), P(b, y, z0), P(b, y, z1), P(a, y, z1)], fill, extra);
}
/** Rect on the +x (right) face. */
export function rightFaceRect(y0: number, y1: number, x: number, u0: number, u1: number, z0: number, z1: number, fill: string, extra = ''): string {
  const a = y0 + (y1 - y0) * u0, b = y0 + (y1 - y0) * u1;
  return poly([P(x, a, z0), P(x, b, z0), P(x, b, z1), P(x, a, z1)], fill, extra);
}

/** Fence posts + rails along a grid line. */
export function fenceLine(a: [number, number], b: [number, number], posts: number, c: { post: string; rail: string; dark: string }, h = 18): string {
  let s = '';
  const at = (t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (const z of [h * 0.45, h * 0.85]) {
    const p0 = P(a[0], a[1], z), p1 = P(b[0], b[1], z);
    s += `<line x1="${f(p0[0])}" y1="${f(p0[1])}" x2="${f(p1[0])}" y2="${f(p1[1])}" stroke="${c.dark}" stroke-width="4.5" stroke-linecap="round"/>`;
    s += `<line x1="${f(p0[0])}" y1="${f(p0[1] - 1)}" x2="${f(p1[0])}" y2="${f(p1[1] - 1)}" stroke="${c.rail}" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  for (let i = 0; i <= posts; i++) {
    const [gx, gy] = at(i / posts);
    const [x, y] = P(gx, gy);
    s += `<rect x="${f(x - 2.5)}" y="${f(y - h - 3)}" width="5" height="${h + 3}" rx="1.5" fill="${c.post}" stroke="${c.dark}" stroke-width="1"/>`;
  }
  return s;
}

export interface SpriteDef {
  w: number;
  h: number;
  svg: string;
  /** origin (0..1) used by the renderer */
  ox: number;
  oy: number;
}

/** Wrap a body drawn around the footprint centre (n x n tiles) into a sprite. */
export function isoSprite(n: number, extraTop: number, body: string, defs = ''): SpriteDef {
  const w = n * TW;
  const h = n * TH + extraTop;
  const cy = h - (n * TH) / 2;
  return {
    w,
    h,
    ox: 0.5,
    oy: 1,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs ? `<defs>${defs}</defs>` : ''}<g transform="translate(${w / 2},${cy})">${body}</g></svg>`,
  };
}

/** Free-form sprite with origin at a given point. */
export function flatSprite(w: number, h: number, body: string, ox = 0.5, oy = 0.5, defs = ''): SpriteDef {
  return {
    w,
    h,
    ox,
    oy,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`,
  };
}

/** Deterministic pseudo random for art variation. */
export function artRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
