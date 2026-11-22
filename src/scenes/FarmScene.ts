import Phaser from 'phaser';
import { ANIMALS, CROPS, GRID, TREES, type Season } from '../sim/data';
import { isRipe } from '../sim/actions';
import { seasonOf } from '../sim/season';
import { entitySize, isFree, landBounds, type Animal, type Entity, type GameState } from '../sim/state';
import type { Store } from '../game/store';
import type { Raster } from '../game/textures';

export type TapTarget =
  | { type: 'entity'; id: number }
  | { type: 'animal'; id: number; building: number }
  | { type: 'ground'; gx: number; gy: number };

export interface SceneCallbacks {
  onTap(t: TapTarget): void;
  onMove(id: number, x: number, y: number): void;
}

const HALF_W = 64;
const HALF_H = 32;
const PAD = 9; // decorative tiles around the grid
const ZOOM_STEPS = [0.7, 1, 1.45];

export const isoX = (gx: number, gy: number) => (gx - gy) * HALF_W;
export const isoY = (gx: number, gy: number) => (gx + gy) * HALF_H;

interface AnimalView {
  img: Phaser.GameObjects.Image;
  u: number;
  v: number;
  tu: number;
  tv: number;
  wait: number;
  hop: number;
}

interface EntView {
  base: Phaser.GameObjects.Image;
  crop?: Phaser.GameObjects.Image;
  bubble?: Phaser.GameObjects.Image;
  bubbleKey?: string;
  animals: Map<number, AnimalView>;
  key: string;
  ex: number;
  ey: number;
}

// Free yard areas (local coords around footprint centre) where animals may walk.
const YARDS: Record<string, [number, number, number, number][]> = {
  coop: [[-0.75, 0.0, 0.75, 0.75], [0.1, -0.75, 0.75, 0.0]],
  bigcoop: [[-0.75, 0.05, 0.75, 0.75], [0.5, -0.75, 0.75, 0.05]],
  pen: [[-0.75, 0.05, 0.75, 0.75], [0.3, -0.75, 0.75, 0.05]],
  barn: [[-0.75, 0.5, 0.8, 0.82], [0.6, -0.75, 0.82, 0.5]],
};

function randomYardPoint(kind: string): [number, number] {
  const rs = YARDS[kind] ?? YARDS.coop;
  const r = rs[Math.random() < 0.65 ? 0 : 1];
  return [r[0] + Math.random() * (r[2] - r[0]), r[1] + Math.random() * (r[3] - r[1])];
}

export class FarmScene extends Phaser.Scene {
  private store!: Store;
  private rasters!: Map<string, Raster>;
  private texScale = 1;
  private cb!: SceneCallbacks;
  private views = new Map<number, EntView>();
  private ground: Phaser.GameObjects.GameObject[] = [];
  private groundKey = '';
  private tint!: Phaser.GameObjects.Rectangle;
  private clouds: Phaser.GameObjects.Image[] = [];
  private rain!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puddles: Phaser.GameObjects.Image[] = [];
  private weatherKey = '';
  private world!: Phaser.GameObjects.Layer;
  private fxCam!: Phaser.Cameras.Scene2D.Camera;
  private overlays: Phaser.GameObjects.GameObject[] = [];
  zoomStep = 1;
  private baseZoom = 1;
  private dpr = 1;
  editMode = false;
  // input state
  private down: { x: number; y: number; sx: number; sy: number; moved: boolean; t: number } | null = null;
  private pinch: { d: number } | null = null;
  private drag: { id: number; ghost: Phaser.GameObjects.Image; sel: Phaser.GameObjects.Image; size: number; gx: number; gy: number; dx: number; dy: number } | null = null;

  constructor() {
    super('farm');
  }

  init(data: { store: Store; rasters: Map<string, Raster>; texScale: number; cb: SceneCallbacks; dpr: number }) {
    this.store = data.store;
    this.rasters = data.rasters;
    this.texScale = data.texScale;
    this.cb = data.cb;
    this.dpr = data.dpr;
  }

  create() {
    for (const [id, r] of this.rasters) if (!this.textures.exists(id)) this.textures.addCanvas(id, r.canvas);
    this.world = this.add.layer();
    this.cameras.main.setBackgroundColor('#9DB846');
    this.input.addPointer(1);
    this.setupCamera();
    this.setupInput();
    this.setupWeather();
    // overlay camera (no zoom) for screen-space effects; world layer is ignored by it
    this.fxCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.fxCam.ignore(this.world);
    this.cameras.main.ignore(this.overlays);
    this.sync();
    this.scale.on('resize', () => this.onResize());
  }

  // ---------- helpers ----------
  private img(key: string, x: number, y: number, overlay = false): Phaser.GameObjects.Image {
    const r = this.rasters.get(key)!;
    const im = this.add.image(x, y, key).setOrigin(r.ox, r.oy).setScale(1 / this.texScale);
    if (overlay) this.overlays.push(im);
    else this.world.add(im);
    return im;
  }
  private setTex(im: Phaser.GameObjects.Image, key: string) {
    if (im.texture.key === key) return;
    const r = this.rasters.get(key)!;
    im.setTexture(key).setOrigin(r.ox, r.oy);
  }

  private get s(): GameState {
    return this.store.s;
  }

  // ---------- camera ----------
  private computeBaseZoom(): number {
    const w = this.scale.width / this.dpr;
    const h = this.scale.height / this.dpr;
    return Math.min(w / 900, h / 620, 1.25);
  }

  private setupCamera() {
    const cam = this.cameras.main;
    this.baseZoom = this.computeBaseZoom();
    cam.setZoom(this.baseZoom * ZOOM_STEPS[this.zoomStep] * this.dpr);
    cam.centerOn(isoX(GRID / 2, GRID / 2), isoY(GRID / 2, GRID / 2) - 40);
  }

  private onResize() {
    this.baseZoom = this.computeBaseZoom();
    const cam = this.cameras.main;
    const c = cam.midPoint.clone();
    cam.setZoom(this.baseZoom * ZOOM_STEPS[this.zoomStep] * this.dpr);
    cam.centerOn(c.x, c.y);
    this.tint.setSize(this.scale.width, this.scale.height);
    this.fxCam.setSize(this.scale.width, this.scale.height);
  }

  setZoomStep(step: number) {
    step = Phaser.Math.Clamp(step, 0, ZOOM_STEPS.length - 1);
    if (step === this.zoomStep) return;
    this.zoomStep = step;
    this.cameras.main.zoomTo(this.baseZoom * ZOOM_STEPS[step] * this.dpr, 220, 'Sine.easeOut');
  }

  focus(id: number) {
    const v = this.views.get(id);
    if (v) this.cameras.main.pan(v.base.x, v.base.y - 40, 400, 'Sine.easeInOut');
  }

  /** CSS-pixel screen position of an entity (top area), for DOM overlays. */
  screenPos(id: number, top = true): { x: number; y: number } | null {
    const v = this.views.get(id);
    if (!v) return null;
    const wy = top ? v.base.y - Math.min(v.base.displayHeight * 0.6, 90) : v.base.y - 30;
    return this.worldToCss(v.base.x, wy);
  }
  worldToCss(wx: number, wy: number) {
    const cam = this.cameras.main;
    return { x: ((wx - cam.worldView.x) * cam.zoom) / this.dpr, y: ((wy - cam.worldView.y) * cam.zoom) / this.dpr };
  }

  // ---------- input ----------
  private gridAt(wx: number, wy: number): [number, number] {
    const gx = (wx / HALF_W + wy / HALF_H) / 2;
    const gy = (wy / HALF_H - wx / HALF_W) / 2;
    return [Math.floor(gx), Math.floor(gy)];
  }

  private hitImage(im: Phaser.GameObjects.Image, wx: number, wy: number): boolean {
    const sc = im.scaleX;
    const lx = (wx - im.x) / sc + im.originX * im.width;
    const ly = (wy - im.y) / sc + im.originY * im.height;
    if (lx < 0 || ly < 0 || lx >= im.width || ly >= im.height) return false;
    const fx = im.flipX ? im.width - lx : lx;
    return this.textures.getPixelAlpha(Math.floor(fx), Math.floor(ly), im.texture.key) > 30;
  }

  private pick(wx: number, wy: number): TapTarget {
    // animals first (drawn on top)
    let best: { t: TapTarget; d: number } | null = null;
    for (const [bid, v] of this.views)
      for (const [aid, av] of v.animals)
        if (this.hitImage(av.img, wx, wy) && (!best || av.img.depth > best.d)) best = { t: { type: 'animal', id: aid, building: bid }, d: av.img.depth };
    if (best) return best.t;
    const [gx, gy] = this.gridAt(wx, wy);
    // tall sprites by pixel test, front-most first
    const sorted = [...this.views.entries()].sort((a, b) => b[1].base.depth - a[1].base.depth);
    for (const [id, v] of sorted) {
      if (this.hitImage(v.base, wx, wy) || (v.crop && this.hitImage(v.crop, wx, wy))) {
        const e = this.s.entities.find((x) => x.id === id);
        // plots: only count the actual tile so neighbouring plots are easy to tap
        if (e && e.kind === 'plot' && !(gx === e.x && gy === e.y) && !(v.crop && this.hitImage(v.crop, wx, wy))) continue;
        return { type: 'entity', id };
      }
    }
    for (const e of this.s.entities) {
      const n = entitySize(e);
      if (gx >= e.x && gx < e.x + n && gy >= e.y && gy < e.y + n) return { type: 'entity', id: e.id };
    }
    return { type: 'ground', gx, gy };
  }

  private setupInput() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const ps = this.activePointers();
      if (ps.length >= 2) {
        this.pinch = { d: Phaser.Math.Distance.Between(ps[0].x, ps[0].y, ps[1].x, ps[1].y) };
        this.down = null;
        this.cancelDrag();
        return;
      }
      const cam = this.cameras.main;
      this.down = { x: p.x, y: p.y, sx: cam.scrollX, sy: cam.scrollY, moved: false, t: p.downTime };
      if (this.editMode) {
        const t = this.pick(p.worldX, p.worldY);
        if (t.type === 'entity') this.startDrag(t.id, p.worldX, p.worldY);
        else if (t.type === 'animal') this.startDrag(t.building, p.worldX, p.worldY);
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const ps = this.activePointers();
      if (this.pinch && ps.length >= 2) {
        const d = Phaser.Math.Distance.Between(ps[0].x, ps[0].y, ps[1].x, ps[1].y);
        if (d / this.pinch.d > 1.3) {
          this.setZoomStep(this.zoomStep + 1);
          this.pinch.d = d;
        } else if (d / this.pinch.d < 0.77) {
          this.setZoomStep(this.zoomStep - 1);
          this.pinch.d = d;
        }
        return;
      }
      if (!this.down || !p.isDown) return;
      if (Math.hypot(p.x - this.down.x, p.y - this.down.y) > 8 * this.dpr) this.down.moved = true;
      if (this.drag) {
        this.updateDrag(p.worldX, p.worldY);
        return;
      }
      if (this.down.moved) {
        const cam = this.cameras.main;
        cam.scrollX = this.down.sx - (p.x - this.down.x) / cam.zoom;
        cam.scrollY = this.down.sy - (p.y - this.down.y) / cam.zoom;
      }
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (this.pinch) {
        if (this.activePointers().length < 2) this.pinch = null;
        return;
      }
      if (this.drag) {
        this.endDrag();
        this.down = null;
        return;
      }
      if (this.down && !this.down.moved && !this.editMode) this.cb.onTap(this.pick(p.worldX, p.worldY));
      this.down = null;
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.setZoomStep(this.zoomStep + (dy < 0 ? 1 : -1)));
  }

  private activePointers(): Phaser.Input.Pointer[] {
    return [this.input.pointer1, this.input.pointer2].filter((p) => p && p.isDown);
  }

  setEditMode(on: boolean) {
    this.editMode = on;
    this.cancelDrag();
    for (const v of this.views.values()) v.base.setAlpha(1);
  }

  private startDrag(id: number, wx: number, wy: number) {
    const e = this.s.entities.find((x) => x.id === id);
    const v = this.views.get(id);
    if (!e || !v) return;
    const n = entitySize(e);
    const ghost = this.img(v.base.texture.key, v.base.x, v.base.y).setAlpha(0.75).setDepth(3e6);
    const sel = this.img(`sel_${n}_ok`, v.base.x, v.base.y).setDepth(2.9e6);
    v.base.setAlpha(0.35);
    const [gx, gy] = this.gridAt(wx, wy);
    this.drag = { id, ghost, sel, size: n, gx: e.x, gy: e.y, dx: gx - e.x, dy: gy - e.y };
  }
  private updateDrag(wx: number, wy: number) {
    const d = this.drag!;
    const [gx, gy] = this.gridAt(wx, wy);
    const nx = gx - d.dx, ny = gy - d.dy;
    d.gx = nx;
    d.gy = ny;
    const x = isoX(nx + d.size, ny + d.size), y = isoY(nx + d.size, ny + d.size);
    d.ghost.setPosition(x, y);
    d.sel.setPosition(x, y);
    const ok = isFree(this.s, nx, ny, d.size, d.id);
    this.setTex(d.sel, `sel_${d.size}_${ok ? 'ok' : 'bad'}`);
  }
  private endDrag() {
    const d = this.drag!;
    this.cb.onMove(d.id, d.gx, d.gy);
    this.cancelDrag();
    this.sync();
  }
  private cancelDrag() {
    if (!this.drag) return;
    this.drag.ghost.destroy();
    this.drag.sel.destroy();
    const v = this.views.get(this.drag.id);
    v?.base.setAlpha(1);
    this.drag = null;
  }

  // ---------- ground ----------
  private buildGround(season: Season) {
    for (const g of this.ground) g.destroy();
    this.ground = [];
    const { min, max } = landBounds(this.s);
    const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
    for (let gy = -PAD; gy < GRID + PAD; gy++)
      for (let gx = -PAD; gx < GRID + PAD; gx++) {
        const h = hash(gx + 100, gy + 100);
        const inside = gx >= min && gx <= max && gy >= min && gy <= max;
        const im = this.img(`tile_grass_${season}_${h % 3}`, isoX(gx + 1, gy + 1), isoY(gx + 1, gy + 1)).setDepth(-1e5);
        if (!inside) im.setTint(gx >= 0 && gy >= 0 && gx < GRID && gy < GRID ? 0xd8dcc0 : 0xc4ccaa);
        this.ground.push(im);
        // scenery trees outside the farm area
        const outsideGrid = gx < 0 || gy < 0 || gx >= GRID || gy >= GRID;
        if (outsideGrid && h % 7 === 0) {
          const t = this.img(`bgtree_${h % 3}`, isoX(gx + 1, gy + 1), isoY(gx + 1, gy + 1));
          t.setDepth(isoY(gx + 1, gy + 1)).setTint(0xeeeeee);
          this.ground.push(t);
        }
      }
    // dirt path from the farm gate outward
    for (let k = max + 1; k < GRID + PAD; k++) {
      const gx = Math.floor(GRID / 2);
      this.ground.push(this.img('tile_path', isoX(gx + 1, k + 1), isoY(gx + 1, k + 1)).setDepth(-9e4));
    }
    // fence around the open land, with a gate gap at the path
    const gate = Math.floor(GRID / 2);
    for (let i = min; i <= max; i++) {
      this.ground.push(this.img('fence_x', isoX(i + 1, min), isoY(i + 1, min)).setDepth(isoY(i + 1, min) - 1));
      this.ground.push(this.img('fence_y', isoX(min, i + 1), isoY(min, i + 1)).setDepth(isoY(min, i + 1) - 1));
      if (i !== gate) this.ground.push(this.img('fence_x', isoX(i + 1, max + 1), isoY(i + 1, max + 1)).setDepth(isoY(i + 1, max + 1) + 1));
      this.ground.push(this.img('fence_y', isoX(max + 1, i + 1), isoY(max + 1, i + 1)).setDepth(isoY(max + 1, i + 1) + 1));
    }
  }

  // ---------- weather ----------
  private setupWeather() {
    this.tint = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xffffff, 0).setOrigin(0).setScrollFactor(0).setDepth(5e6);
    this.overlays.push(this.tint);
    for (let i = 0; i < 5; i++) {
      const c = this.img('fx_cloud', Math.random() * this.scale.width, this.scale.height * (0.05 + Math.random() * 0.22), true);
      c.setScrollFactor(0).setDepth(5.1e6).setScale((0.5 + Math.random() * 0.5) * this.dpr / this.texScale);
      c.setData('speed', (6 + Math.random() * 10) * this.dpr);
      this.clouds.push(c);
    }
    this.rain = this.add.particles(0, 0, 'fx_rain', {
      x: { min: -100, max: this.scale.width + 200 },
      y: -30,
      lifespan: 1400,
      speedY: { min: 700 * this.dpr, max: 900 * this.dpr },
      speedX: -120 * this.dpr,
      rotate: 8,
      scale: this.dpr / this.texScale,
      quantity: 3,
      frequency: 16,
      alpha: { start: 0.9, end: 0.6 },
      emitting: false,
    });
    this.rain.setScrollFactor(0).setDepth(5.2e6);
    this.overlays.push(this.rain);
  }

  private applyWeather(season: Season) {
    const w = this.s.weather.type;
    const key = `${season}-${w}-${this.s.landStage}`;
    if (key === this.weatherKey) return;
    this.weatherKey = key;
    const tints: Record<string, [number, number]> = {
      winter: [0x5b8fc9, 0.13],
      spring: [0xfff3c4, 0.05],
      summer: [0xffd54f, 0.12],
      autumn: [0xff8f2e, 0.07],
    };
    let [c, a] = tints[season];
    if (w === 'rain') [c, a] = [0x3d5670, 0.22];
    if (w === 'heat') [c, a] = [0xffa726, 0.16];
    if (w === 'cloud') a += 0.04;
    this.tint.setFillStyle(c, a);
    const cloudy = w === 'rain' || w === 'cloud' || season === 'winter';
    this.clouds.forEach((cl, i) => {
      cl.setVisible(cloudy || i < 2);
      cl.setAlpha(w === 'rain' ? 0.8 : cloudy ? 0.65 : 0.5);
      cl.setTint(w === 'rain' ? 0xa9b6c0 : 0xffffff);
    });
    this.rain.emitting = w === 'rain';
    for (const p of this.puddles) p.destroy();
    this.puddles = [];
    if (w === 'rain') {
      const { min, max } = landBounds(this.s);
      for (let i = 0; i < 8; i++) {
        const gx = min + Math.floor(Math.random() * (max - min + 1));
        const gy = min + Math.floor(Math.random() * (max - min + 1));
        if (!isFree(this.s, gx, gy, 1)) continue;
        this.puddles.push(this.img('fx_puddle', isoX(gx + 0.5, gy + 0.5), isoY(gx + 0.5, gy + 0.5) + HALF_H).setDepth(-5e4));
      }
    }
  }

  // ---------- entities ----------
  private entityKey(e: Entity, now: number): string {
    switch (e.kind) {
      case 'plot':
        return e.plot.water > 0 ? 'plot_wet' : 'plot_dry';
      case 'structure':
        return `bld_${e.type}`;
      case 'tree': {
        const def = TREES[e.type];
        if (e.age < def.matureMs) return `tree_${e.type}_young`;
        return e.hasFruit ? `tree_${e.type}_fruit` : `tree_${e.type}_mature`;
      }
      case 'deco':
        return `deco_${e.type}`;
    }
    void now;
  }

  private cropKey(e: Entity): string | null {
    if (e.kind !== 'plot' || !e.plot.crop) return null;
    if (e.plot.withered) return 'crop_withered';
    const f = e.plot.grow / CROPS[e.plot.crop].growMs;
    const st = f >= 1 ? 3 : f >= 0.5 ? 2 : f >= 0.15 ? 1 : 0;
    return `crop_${e.plot.crop}_stage${st}`;
  }

  private bubbleKey(e: Entity): string | null {
    if (e.kind === 'plot') {
      const p = e.plot;
      if (!p.crop) return null;
      if (p.withered) return 'bubble_withered';
      if (isRipe(p)) return `bubble_item_${p.crop}`;
      if (p.water <= 0) return 'bubble_water';
      return null;
    }
    if (e.kind === 'tree') return e.hasFruit ? `bubble_item_${e.type}` : null;
    if (e.kind === 'structure') {
      if (e.animals?.length) {
        if (e.animals.some((a) => a.sick)) return 'bubble_sick';
        const ready = e.animals.find((a) => a.ready);
        if (ready) return `bubble_item_${ANIMALS[ready.type].product}`;
        if (e.animals.some((a) => a.hunger < 20)) return 'bubble_hungry';
      }
      if (e.plots) {
        const r = e.plots.find((p) => isRipe(p));
        if (r) return `bubble_item_${r.crop}`;
        if (e.plots.some((p) => p.withered)) return 'bubble_withered';
      }
    }
    return null;
  }

  sync() {
    const now = Date.now();
    const season = seasonOf(now);
    const gk = `${season}-${this.s.landStage}`;
    if (gk !== this.groundKey) {
      this.groundKey = gk;
      this.buildGround(season);
      this.weatherKey = '';
    }
    this.applyWeather(season);
    const seen = new Set<number>();
    for (const e of this.s.entities) {
      seen.add(e.id);
      const n = entitySize(e);
      const x = isoX(e.x + n, e.y + n), y = isoY(e.x + n, e.y + n);
      const key = this.entityKey(e, now);
      let v = this.views.get(e.id);
      if (!v) {
        const base = this.img(key, x, y);
        v = { base, animals: new Map(), key, ex: e.x, ey: e.y };
        this.views.set(e.id, v);
        base.setScale(0.01 / this.texScale);
        this.tweens.add({ targets: base, scale: 1 / this.texScale, duration: 260, ease: 'Back.easeOut' });
      }
      this.setTex(v.base, key);
      v.base.setPosition(x, y).setDepth(y);
      if (v.ex !== e.x || v.ey !== e.y) {
        // moved: reset animal positions
        v.ex = e.x;
        v.ey = e.y;
      }
      // crop
      const ck = this.cropKey(e);
      if (ck) {
        if (!v.crop) {
          const r = this.rasters.get(ck)!;
          v.crop = this.img(ck, x, y);
          const h = r.canvas.height / this.texScale;
          v.crop.setOrigin(0.5, (h - HALF_H) / h);
          this.tweens.add({ targets: v.crop, rotation: { from: -0.02, to: 0.02 }, duration: 1600 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        if (v.crop.texture.key !== ck) v.crop.setTexture(ck);
        v.crop.setPosition(x, y - HALF_H).setDepth(y + 0.2);
      } else if (v.crop) {
        v.crop.destroy();
        v.crop = undefined;
      }
      // bubble
      const bk = this.bubbleKey(e);
      if (bk !== (v.bubbleKey ?? null)) {
        v.bubble?.destroy();
        v.bubble = undefined;
        v.bubbleKey = bk ?? undefined;
        if (bk) {
          const top = e.kind === 'plot' ? 56 : Math.min(v.base.displayHeight - 30, 150);
          const b = this.img(bk, x, y - top).setDepth(4e6).setScale(0.62 / this.texScale);
          this.tweens.add({ targets: b, y: y - top - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          v.bubble = b;
        }
      } else if (v.bubble && e.kind !== 'plot') {
        // keep position in sync if moved
        const top = Math.min(v.base.displayHeight - 30, 150);
        if (Math.abs(v.bubble.x - x) > 1) v.bubble.setPosition(x, y - top);
      } else if (v.bubble && Math.abs(v.bubble.x - x) > 1) v.bubble.setPosition(x, y - 56);
      // animals
      if (e.kind === 'structure') this.syncAnimals(e.type, e.x, e.y, e.animals ?? [], v, y);
    }
    for (const [id, v] of this.views)
      if (!seen.has(id)) {
        v.base.destroy();
        v.crop?.destroy();
        v.bubble?.destroy();
        for (const a of v.animals.values()) a.img.destroy();
        this.views.delete(id);
      }
  }

  private syncAnimals(kind: string, ex: number, ey: number, animals: Animal[], v: EntView, depth: number) {
    const seen = new Set<number>();
    for (const a of animals) {
      seen.add(a.id);
      let av = v.animals.get(a.id);
      if (!av) {
        const [u, vv] = randomYardPoint(kind);
        av = { img: this.img(`animal_${a.type}`, 0, 0), u, v: vv, tu: u, tv: vv, wait: Math.random() * 2, hop: 0 };
        v.animals.set(a.id, av);
      }
      const adult = a.age >= 3 * 24 * 3600 * 1000;
      const k = (adult ? 1 : 0.62) * (a.type === 'chicken' ? 0.75 : a.type === 'cow' ? 1.05 : 0.9);
      av.img.setData('k', k).setData('kind', kind).setData('ex', ex).setData('ey', ey).setData('depth', depth);
      av.img.setTint(a.sick ? 0xc5e3a5 : 0xffffff);
    }
    for (const [id, av] of v.animals)
      if (!seen.has(id)) {
        av.img.destroy();
        v.animals.delete(id);
      }
  }

  private clampCamera() {
    const cam = this.cameras.main;
    const mx = cam.midPoint.x, my = cam.midPoint.y;
    const cx = Phaser.Math.Clamp(mx, -GRID * HALF_W * 0.8, GRID * HALF_W * 0.8);
    const cy = Phaser.Math.Clamp(my, HALF_H * 2, GRID * 2 * HALF_H - HALF_H * 2);
    if (cx !== mx || cy !== my) cam.centerOn(cx, cy);
  }

  update(_t: number, dtMs: number) {
    const dt = dtMs / 1000;
    this.clampCamera();
    for (const v of this.views.values()) {
      for (const av of v.animals.values()) {
        const im = av.img;
        const kind = im.getData('kind') as string;
        const ex = im.getData('ex') as number, ey = im.getData('ey') as number;
        if (av.wait > 0) av.wait -= dt;
        else {
          const du = av.tu - av.u, dv = av.tv - av.v;
          const d = Math.hypot(du, dv);
          const speed = kind.includes('coop') ? 0.28 : 0.16;
          if (d < 0.02) {
            [av.tu, av.tv] = randomYardPoint(kind);
            av.wait = 0.6 + Math.random() * 2.5;
          } else {
            const step = Math.min(d, speed * dt);
            av.u += (du / d) * step;
            av.v += (dv / d) * step;
            const sx = isoX(du, dv);
            if (Math.abs(sx) > 0.001) im.setFlipX(sx > 0);
            av.hop += dt * 14;
          }
        }
        const gx = ex + 1 + av.u, gy = ey + 1 + av.v;
        const k = im.getData('k') as number;
        im.setScale(k / this.texScale);
        im.setPosition(isoX(gx, gy), isoY(gx, gy) - Math.abs(Math.sin(av.hop)) * 2.5);
        im.setDepth((im.getData('depth') as number) + 0.3 + (av.u + av.v) * 0.05);
      }
    }
    const w = this.scale.width;
    for (const c of this.clouds) {
      c.x += (c.getData('speed') as number) * dt;
      if (c.x - c.displayWidth / 2 > w) {
        c.x = -c.displayWidth / 2;
        c.y = this.scale.height * (0.05 + Math.random() * 0.22);
      }
    }
  }

  // ---------- small effects ----------
  pulse(id: number) {
    const v = this.views.get(id);
    if (!v) return;
    const s = 1 / this.texScale;
    this.tweens.add({ targets: [v.base, v.crop].filter(Boolean), scaleX: s * 1.08, scaleY: s * 0.94, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  }

  splash(id: number) {
    const v = this.views.get(id);
    if (!v) return;
    for (let i = 0; i < 10; i++) {
      const d = this.img('fx_rain', v.base.x + (Math.random() - 0.5) * 80, v.base.y - 90 - Math.random() * 30).setDepth(4.5e6).setTint(0x5bb6e8);
      this.tweens.add({ targets: d, y: d.y + 60 + Math.random() * 20, alpha: 0, duration: 420 + Math.random() * 200, delay: i * 25, onComplete: () => d.destroy() });
    }
  }

  sparkle(id: number) {
    const v = this.views.get(id);
    if (!v) return;
    for (let i = 0; i < 6; i++) {
      const sp = this.img('fx_sparkle', v.base.x + (Math.random() - 0.5) * 70, v.base.y - 40 - Math.random() * 40).setDepth(4.5e6);
      this.tweens.add({ targets: sp, y: sp.y - 30, alpha: 0, angle: 90, duration: 600, delay: i * 40, onComplete: () => sp.destroy() });
    }
  }
}
