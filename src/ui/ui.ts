import { icon, type IconName } from '../art/icons';
import { spriteUrl } from '../art/sprites';
import {
  ANIMALS, CROPS, DECOS, LAND_STAGES, SEASON_NAMES, STRUCTURES, TREES,
  type CropId, type ProductId, type StructureKind, type TreeId,
} from '../sim/data';
import { isRipe, plotRemaining, speedUpCost, treeRemaining, type Result } from '../sim/actions';
import { xpToNext } from '../sim/level';
import { seasonOf } from '../sim/season';
import type { SimEvents } from '../sim/sim';
import { findEntity, type GameState } from '../sim/state';
import type { Store } from '../game/store';
import type { FarmScene, TapTarget } from '../scenes/FarmScene';
import { fmt, fmtDur, ring } from './util';
import { play, setSound, type Sfx } from './sound';
import * as Screens from './screens';
import { Tutorial } from './tutorial';

export interface SheetSpec {
  id: string;
  title: () => string;
  sub?: () => string;
  head?: () => string;
  body: () => string;
  on?: Record<string, (el: HTMLElement, ev: Event) => void>;
  onClose?: () => void;
}

interface PopSpec {
  entityId: number;
  body: () => string;
  on?: Record<string, (el: HTMLElement) => void>;
}

type FlyTarget = 'coins' | 'diamonds' | 'xp' | 'storage';

const WEATHER_ICON: Record<string, IconName> = { sun: 'sun', cloud: 'cloud', rain: 'rain', heat: 'heat' };

export class UI {
  readonly col: HTMLElement;
  private hudEl!: HTMLElement;
  private navEl!: HTMLElement;
  private toolsEl!: HTMLElement;
  private sheetWrap: HTMLElement | null = null;
  private popEl: HTMLElement | null = null;
  private modalEl: HTMLElement | null = null;
  private editEl: HTMLElement | null = null;
  private toastEl: HTMLElement | null = null;
  private toastTimer = 0;
  private fx: HTMLElement;
  sheet: SheetSpec | null = null;
  private pop: PopSpec | null = null;
  private modalOn: Record<string, (el: HTMLElement) => void> = {};
  private modalQueue: (() => void)[] = [];
  private lastBody = '';
  private lastPop = '';
  editMode = false;
  tutorial: Tutorial;
  private globalOn: Record<string, (el: HTMLElement, ev: Event) => void>;

  constructor(public store: Store, public scene: FarmScene) {
    const root = document.getElementById('ui')!;
    root.innerHTML = '<div class="col"></div>';
    this.col = root.firstElementChild as HTMLElement;
    this.fx = document.getElementById('fx')!;
    this.globalOn = {
      nav: (el) => this.nav(el.dataset.v!),
      edit: () => this.setEdit(!this.editMode),
      settings: () => Screens.openSettings(this),
      zoomin: () => this.scene.setZoomStep(this.scene.zoomStep + 1),
      zoomout: () => this.scene.setZoomStep(this.scene.zoomStep - 1),
      level: () => this.toast(`רמה ${this.s.level} · ${fmt(this.s.xp)}/${fmt(xpToNext(this.s.level))} נק׳ ניסיון`),
      'close-sheet': () => this.closeSheet(),
      'close-modal': () => this.closeModal(),
    };
    this.buildStatic();
    // Fire actions on pointerup (matching the pointerdown target signature) so that a re-render
    // between press and release (1s live refresh) never swallows a tap. Keyboard clicks still work.
    let down: { sig: string; x: number; y: number } | null = null;
    const sig = (el: HTMLElement | null) => (el ? `${el.dataset.a}|${el.dataset.v ?? ''}|${el.className}` : '');
    const target = (ev: Event) => (ev.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
    this.col.addEventListener('pointerdown', (ev) => {
      const el = target(ev);
      down = el ? { sig: sig(el), x: ev.clientX, y: ev.clientY } : null;
    });
    this.col.addEventListener('pointerup', (ev) => {
      const el = target(ev);
      if (el && down && sig(el) === down.sig && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) < 14 && !(el as HTMLButtonElement).disabled) this.onClick(el, ev);
      down = null;
    });
    this.col.addEventListener('click', (ev) => {
      if ((ev as MouseEvent).detail === 0) {
        const el = target(ev);
        if (el) this.onClick(el, ev);
      }
    });
    // stop UI pointer events from reaching the Phaser canvas
    for (const t of ['pointerdown', 'pointerup', 'wheel', 'touchstart']) this.col.addEventListener(t, (e) => { if (e.target !== this.col) e.stopPropagation(); }, { passive: true });
    setSound(this.s.settings.sound);
    this.tutorial = new Tutorial(this);
    store.on(() => this.refresh());
    store.onAction((name, res) => this.afterAction(name, res));
  }

  get s(): GameState {
    return this.store.s;
  }

  sfx(s: Sfx) {
    play(s);
  }

  // ---------------- static chrome ----------------
  private buildStatic() {
    this.hudEl = document.createElement('div');
    this.hudEl.className = 'hud';
    this.col.appendChild(this.hudEl);

    this.toolsEl = document.createElement('div');
    this.toolsEl.innerHTML = `
      <div class="tools">
        <button class="tool" data-a="edit" aria-label="מצב עריכה">${icon('edit')}</button>
        <button class="tool" data-a="settings" aria-label="הגדרות">${icon('settings')}</button>
      </div>
      <div class="zoom">
        <button class="tool" data-a="zoomin" aria-label="התקרב">+</button>
        <button class="tool" data-a="zoomout" aria-label="התרחק">−</button>
      </div>`;
    this.col.appendChild(this.toolsEl);

    this.navEl = document.createElement('div');
    this.navEl.className = 'nav';
    const items: [string, IconName, string][] = [
      ['farm', 'farm', 'חווה'],
      ['shop', 'shop', 'חנות'],
      ['storage', 'storage', 'מחסן'],
      ['market', 'market', 'שוק'],
      ['tasks', 'tasks', 'משימות'],
    ];
    this.navEl.innerHTML = items.map(([v, ic, label]) => `<button data-a="nav" data-v="${v}" id="nav-${v}">${icon(ic)}<span>${label}</span></button>`).join('');
    this.col.appendChild(this.navEl);
    this.renderHud();
  }

  private renderHud() {
    const s = this.s;
    const need = xpToNext(s.level);
    const season = seasonOf(Date.now());
    this.hudEl.innerHTML = `
      <div class="hud-row">
        <button class="lvl" data-a="level" id="hud-level">${ring(s.xp / need, '#5DBB46', `<span class="num">${s.level}</span>`, '#EAD6B0', 5)}<span class="ttl">המושב</span></button>
        <div class="spacer"></div>
        <div class="pill" id="hud-diamonds">${icon('diamond')}<span class="num">${fmt(s.diamonds)}</span></div>
        <div class="pill" id="hud-coins">${icon('coin')}<span class="num">${fmt(s.coins)}</span></div>
      </div>
      <div class="weather" title="מזג אוויר">${icon(WEATHER_ICON[s.weather.type])}<span class="t">${s.weather.temp}°</span><span class="s">${SEASON_NAMES[season]}</span></div>`;
    const done = s.tasks.list.filter((t) => !t.claimed && t.progress >= t.n).length;
    const tb = this.navEl.querySelector('#nav-tasks')!;
    tb.querySelector('.badge')?.remove();
    if (done) tb.insertAdjacentHTML('beforeend', `<span class="badge">${done}</span>`);
  }

  private nav(v: string) {
    this.sfx('tap');
    this.closePop();
    if (v === 'farm') return this.closeSheet();
    if (v === 'shop') Screens.openShop(this);
    if (v === 'storage') Screens.openStorage(this);
    if (v === 'market') Screens.openMarket(this);
    if (v === 'tasks') Screens.openTasks(this);
  }

  private markNav() {
    const id = this.sheet?.id.split(':')[0] ?? 'farm';
    this.navEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.v === (['shop', 'storage', 'market', 'tasks'].includes(id) ? id : 'farm')));
  }

  // ---------------- click routing ----------------
  private onClick(el: HTMLElement, ev: Event) {
    const a = el.dataset.a!;
    const fn = (this.modalEl && this.modalOn[a]) || (this.pop?.on?.[a]) || (this.sheet?.on?.[a]) || this.globalOn[a];
    if (fn) fn(el, ev);
  }

  // ---------------- sheets ----------------
  openSheet(spec: SheetSpec) {
    this.closePop();
    const replacing = !!this.sheetWrap;
    if (this.sheet?.onClose) this.sheet.onClose();
    this.sheet = spec;
    if (!this.sheetWrap) {
      this.sheetWrap = document.createElement('div');
      this.sheetWrap.style.cssText = 'position:absolute;inset:0;z-index:2';
      this.sheetWrap.innerHTML = `<div class="backdrop" data-a="close-sheet"></div><div class="sheet" role="dialog"><div class="sheet-head"><h2></h2><span class="sub"></span><button class="x" data-a="close-sheet" aria-label="סגור">${icon('close')}</button></div><div class="sheet-tabs"></div><div class="sheet-body"></div></div>`;
      this.col.insertBefore(this.sheetWrap, this.navEl);
    }
    if (replacing) (this.sheetWrap.querySelector('.sheet-body') as HTMLElement).scrollTop = 0;
    this.lastBody = '';
    this.renderSheet();
    this.markNav();
    this.tutorial.update();
  }

  closeSheet() {
    if (!this.sheetWrap) return;
    const w = this.sheetWrap;
    this.sheetWrap = null;
    this.sheet?.onClose?.();
    this.sheet = null;
    w.querySelector('.sheet')!.classList.add('closing');
    w.querySelector('.backdrop')!.classList.add('closing');
    setTimeout(() => w.remove(), 200);
    this.markNav();
    this.tutorial.update();
  }

  renderSheet() {
    if (!this.sheet || !this.sheetWrap) return;
    const ae = document.activeElement as HTMLElement | null;
    if (ae && ae.tagName === 'INPUT' && this.sheetWrap.contains(ae)) return; // don't clobber typing
    const w = this.sheetWrap;
    (w.querySelector('.sheet-head h2') as HTMLElement).textContent = this.sheet.title();
    (w.querySelector('.sheet-head .sub') as HTMLElement).innerHTML = this.sheet.sub?.() ?? '';
    const tabs = w.querySelector('.sheet-tabs') as HTMLElement;
    const th = this.sheet.head?.() ?? '';
    if (tabs.innerHTML !== th) tabs.innerHTML = th;
    const html = this.sheet.body();
    if (html === this.lastBody) return;
    this.lastBody = html;
    const body = w.querySelector('.sheet-body') as HTMLElement;
    const top = body.scrollTop;
    const hs = [...body.querySelectorAll<HTMLElement>('[data-scroll]')].map((e) => [e.dataset.scroll!, e.scrollLeft] as const);
    body.innerHTML = html;
    body.scrollTop = top;
    for (const [k, l] of hs) {
      const e = body.querySelector<HTMLElement>(`[data-scroll="${k}"]`);
      if (e) e.scrollLeft = l;
    }
  }

  // ---------------- popover (world anchored) ----------------
  openPop(spec: PopSpec) {
    this.closePop();
    this.pop = spec;
    this.popEl = document.createElement('div');
    this.popEl.className = 'pop';
    this.col.appendChild(this.popEl);
    this.lastPop = '';
    this.renderPop();
  }
  closePop() {
    this.popEl?.remove();
    this.popEl = null;
    this.pop = null;
  }
  private renderPop() {
    if (!this.pop || !this.popEl) return;
    const html = this.pop.body();
    if (!html) return this.closePop();
    if (html !== this.lastPop) {
      this.popEl.innerHTML = html;
      this.lastPop = html;
    }
    this.positionPop();
  }
  positionPop() {
    if (!this.pop || !this.popEl) return;
    const p = this.scene.screenPos(this.pop.entityId, true);
    if (!p) return this.closePop();
    const colRect = this.col.getBoundingClientRect();
    const half = this.popEl.offsetWidth / 2 + 6;
    const x = Math.max(half, Math.min(colRect.width - half, p.x - colRect.left));
    this.popEl.style.left = `${x}px`;
    this.popEl.style.top = `${Math.max(this.popEl.offsetHeight + 110, p.y)}px`;
  }

  // ---------------- modal ----------------
  showModal(html: string, on: Record<string, (el: HTMLElement) => void> = {}) {
    if (this.modalEl) {
      this.modalQueue.push(() => this.showModal(html, on));
      return;
    }
    this.modalOn = on;
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-wrap';
    this.modalEl.innerHTML = `<div class="modal" role="dialog">${html}</div>`;
    this.col.appendChild(this.modalEl);
    this.tutorial.update();
  }
  closeModal() {
    this.modalEl?.remove();
    this.modalEl = null;
    this.modalOn = {};
    const next = this.modalQueue.shift();
    if (next) next();
    else this.checkLevelUp();
    this.tutorial.update();
  }
  get modalOpen() {
    return !!this.modalEl;
  }

  confirm(title: string, text: string, okLabel: string, ok: () => void, danger = false) {
    this.showModal(
      `<h2>${title}</h2><p>${text}</p><div class="rowbtns"><button class="btn ${danger ? 'red' : ''}" data-a="ok">${okLabel}</button><button class="btn white" data-a="close-modal">ביטול</button></div>`,
      { ok: () => { this.closeModal(); ok(); }, 'close-modal': () => this.closeModal() },
    );
  }

  // ---------------- toast ----------------
  toast(msg: string, good = false) {
    this.toastEl?.remove();
    clearTimeout(this.toastTimer);
    this.toastEl = document.createElement('div');
    this.toastEl.className = `toast${good ? ' good' : ''}`;
    this.toastEl.textContent = msg;
    this.col.appendChild(this.toastEl);
    this.toastTimer = window.setTimeout(() => {
      this.toastEl?.remove();
      this.toastEl = null;
    }, 2400);
  }

  // ---------------- fly effects ----------------
  private targetEl(t: FlyTarget): HTMLElement | null {
    return document.getElementById(t === 'coins' ? 'hud-coins' : t === 'diamonds' ? 'hud-diamonds' : t === 'xp' ? 'hud-level' : 'nav-storage');
  }

  fly(from: { x: number; y: number }, html: string, target: FlyTarget, count = 1, label?: string) {
    const tEl = this.targetEl(target);
    if (!tEl) return;
    const r = tEl.getBoundingClientRect();
    const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
    const n = Math.min(count, 8);
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'fly';
      el.innerHTML = html;
      const sx = from.x + (Math.random() - 0.5) * 30 * (n > 1 ? 1 : 0);
      const sy = from.y;
      el.style.left = `${sx}px`;
      el.style.top = `${sy}px`;
      this.fx.appendChild(el);
      const hop = -40 - Math.random() * 20;
      const anim = el.animate(
        [
          { transform: 'translate(0,0) scale(.5)', opacity: 0 },
          { transform: `translate(0,${hop}px) scale(1.15)`, opacity: 1, offset: 0.25 },
          { transform: `translate(0,${hop + 8}px) scale(1)`, opacity: 1, offset: 0.4 },
          { transform: `translate(${tx - sx}px,${ty - sy}px) scale(.6)`, opacity: 0.9 },
        ],
        { duration: 850 + i * 60, delay: i * 70, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' },
      );
      anim.onfinish = () => {
        el.remove();
        tEl.classList.remove('bump');
        void tEl.offsetWidth;
        tEl.classList.add('bump');
      };
    }
    if (label) this.floatText(from, label);
  }

  floatText(at: { x: number; y: number }, text: string) {
    const el = document.createElement('div');
    el.className = 'floattext';
    el.textContent = text;
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y - 20}px`;
    this.fx.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  entityScreen(id: number) {
    const p = this.scene.screenPos(id, false);
    return p ?? { x: innerWidth / 2, y: innerHeight / 2 };
  }

  // ---------------- edit mode ----------------
  setEdit(on: boolean) {
    this.editMode = on;
    this.scene.setEditMode(on);
    this.closePop();
    this.closeSheet();
    this.toolsEl.querySelector('[data-a="edit"]')!.classList.toggle('on', on);
    this.editEl?.remove();
    this.editEl = null;
    if (on) {
      this.editEl = document.createElement('div');
      this.editEl.className = 'editbar';
      this.editEl.innerHTML = `${icon('edit')}<span>מצב עריכה: גררו מבנים וחלקות למקום חדש</span><button class="btn small white" data-a="edit">סיום</button>`;
      this.col.appendChild(this.editEl);
    }
  }

  // ---------------- world taps ----------------
  handleTap(t: TapTarget) {
    if (this.modalOpen) return;
    if (this.sheet) {
      this.closeSheet();
      return;
    }
    this.closePop();
    this.store.tick();
    if (t.type === 'ground') return;
    if (t.type === 'animal') {
      this.sfx('animal');
      Screens.openAnimal(this, t.id);
      return;
    }
    const e = findEntity(this.s, t.id);
    if (!e) return;
    this.scene.pulse(e.id);
    if (e.kind === 'plot') {
      const p = e.plot;
      if (!p.crop) return Screens.openPlant(this, e.id);
      if (p.withered) {
        const r = this.store.act('clearPlot', e.id);
        if (r.ok) this.toast('הצמח היבש נוקה – אפשר לשתול מחדש');
        return;
      }
      if (isRipe(p)) return this.doHarvest(e.id);
      if (p.water <= 0) {
        const r = this.store.act('water', e.id);
        if (r.ok) {
          this.scene.splash(e.id);
          this.sfx('water');
        }
        return;
      }
      return this.openGrowPop(e.id);
    }
    if (e.kind === 'tree') {
      if (e.hasFruit) {
        const r = this.store.act('harvestTree', e.id);
        if (r.ok) this.rewardFx(e.id, r);
        return;
      }
      return this.openTreePop(e.id);
    }
    if (e.kind === 'deco') return this.toast(`${DECOS[e.type].name} – משמח חיות ברדיוס 3`);
    switch (e.type) {
      case 'house':
        return Screens.openTasks(this);
      case 'greenhouse':
        return Screens.openGreenhouse(this, e.id);
      case 'pump':
        return this.toast('משאבת המים משקה את כל החלקות ברדיוס 3');
      case 'tractor': {
        const ripe = this.s.entities.filter((x) => x.kind === 'plot' && isRipe(x.plot)).map((x) => x.id);
        const r = this.store.act('harvestAll');
        if (r.ok) {
          this.sfx('harvest');
          ripe.slice(0, 6).forEach((id) => this.fly(this.entityScreen(id), icon('star'), 'xp'));
          this.floatText(this.entityScreen(e.id), `נקצרו ${r.count as number} חלקות · +${r.xp as number} נק׳`);
          if (r.msg) this.toast(r.msg as string);
        }
        return;
      }
      default:
        return Screens.openBuilding(this, e.id);
    }
  }

  doHarvest(id: number, slot?: number) {
    const r = this.store.act('harvest', id, slot);
    if (r.ok) {
      this.scene.sparkle(id);
      this.rewardFx(id, r);
    }
  }

  /** Item flies to storage, XP star flies to the level ring. */
  rewardFx(id: number, r: Result, from?: { x: number; y: number }) {
    if (!r.ok) return;
    const at = from ?? this.entityScreen(id);
    this.sfx('harvest');
    if (r.item) this.fly(at, `<img src="${spriteUrl(`item_${r.item as string}`)}" alt="">`, 'storage', (r.count as number) ?? 1);
    if (r.xp) setTimeout(() => this.fly(at, icon('star'), 'xp', 1, `+${r.xp as number} נק׳`), 120);
  }

  private openGrowPop(id: number) {
    this.openPop({
      entityId: id,
      body: () => {
        const e = findEntity(this.s, id);
        if (!e || e.kind !== 'plot' || !e.plot.crop || isRipe(e.plot) || e.plot.withered) return '';
        const def = CROPS[e.plot.crop as CropId];
        const rem = plotRemaining(e.plot);
        const cost = speedUpCost(rem);
        const wet = e.plot.water > 0;
        return `${ring(1 - rem / def.growMs, '#5DBB46', fmtDur(rem).replace(' ', '<br>'))}
          <div class="info"><span class="nm">${def.name}</span>
          <span class="sm">${icon('drop')}${wet ? `מושקה עוד ${fmtDur(e.plot.water)}` : 'יבשה – הגידול נעצר'}</span></div>
          <button class="btn blue small" data-a="speed">${icon('bolt')}האץ ${icon('diamond')}${cost}</button>`;
      },
      on: {
        speed: () => {
          const r = this.store.act('speedUpPlot', id);
          if (r.ok) {
            this.closePop();
            this.scene.sparkle(id);
          }
        },
      },
    });
  }

  private openTreePop(id: number) {
    this.openPop({
      entityId: id,
      body: () => {
        const e = findEntity(this.s, id);
        if (!e || e.kind !== 'tree' || e.hasFruit) return '';
        const def = TREES[e.type as TreeId];
        const rem = treeRemaining(this.s, id);
        const young = e.age < def.matureMs;
        const inSeason = def.seasons.includes(seasonOf(Date.now()));
        const seasons = def.seasons.map((x) => SEASON_NAMES[x]).join(' ו');
        if (!young && !inSeason)
          return `<div class="info"><span class="nm">${def.name}</span><span class="sm">${icon('lock')}מחוץ לעונת הפרי</span><span class="sm">נותן פרי ב${seasons}</span></div>`;
        const total = young ? def.matureMs : def.fruitMs;
        return `${ring(1 - rem / total, young ? '#3AA0E0' : '#F39A2B', fmtDur(rem).replace(' ', '<br>'))}
          <div class="info"><span class="nm">${def.name}</span><span class="sm">${young ? 'העץ גדל' : `${def.fruitName} בדרך`}</span></div>
          <button class="btn blue small" data-a="speed">${icon('bolt')}האץ ${icon('diamond')}${speedUpCost(rem)}</button>`;
      },
      on: {
        speed: () => {
          const r = this.store.act('speedUpTree', id, Date.now());
          if (r.ok) {
            this.closePop();
            this.scene.sparkle(id);
          }
        },
      },
    });
  }

  // ---------------- per-action feedback ----------------
  private afterAction(name: string, res: Result) {
    if (!res.ok) {
      this.sfx('error');
      this.toast(res.msg);
      return;
    }
    if (name === 'plant') this.sfx('plant');
    if (name === 'sell') this.sfx('coin');
    this.tutorial.onAction(name);
    this.checkLevelUp();
  }

  checkLevelUp() {
    if (this.modalOpen || !this.s.pendingLevelUps.length) return;
    const lvl = this.s.pendingLevelUps[0];
    this.sfx('level');
    const unlocks: { img: string; name: string }[] = [];
    for (const c of Object.values(CROPS)) if (c.level === lvl) unlocks.push({ img: `item_${c.id}`, name: c.name });
    for (const t of Object.values(TREES)) if (t.level === lvl) unlocks.push({ img: `tree_${t.id}_mature`, name: t.name });
    for (const a of Object.values(ANIMALS)) if (a.level === lvl) unlocks.push({ img: `animal_${a.id}`, name: a.name });
    for (const st of Object.values(STRUCTURES)) if (st.buyable && st.level === lvl && st.level > 1) unlocks.push({ img: `bld_${st.kind as StructureKind}`, name: st.name });
    for (const d of Object.values(DECOS)) if (d.level === lvl) unlocks.push({ img: `deco_${d.kind}`, name: d.name });
    for (const l of LAND_STAGES) if (l.level === lvl && l.price) unlocks.push({ img: 'tile_path', name: `הרחבת אדמה ל-${l.size}×${l.size}` });
    const conf = Array.from({ length: 26 }, (_, i) => `<i style="left:${(i * 37) % 100}%;background:${['#F39A2B', '#5DBB46', '#3AA0E0', '#E8574A', '#FFE15A'][i % 5]};animation-delay:${(i % 7) * 0.08}s"></i>`).join('');
    this.showModal(
      `<div class="confetti">${conf}</div>
       <div class="hero">${icon('star')}</div>
       <h2>עלית לרמה ${lvl}!</h2>
       <p class="rewards" style="justify-content:center"><span class="r">+2 ${icon('diamond')}</span></p>
       ${unlocks.length ? `<p>נפתח עכשיו:</p><div class="unlocks">${unlocks.map((u) => `<div class="u"><img src="${spriteUrl(u.img)}" alt="">${u.name}</div>`).join('')}</div>` : ''}
       <button class="btn wide" data-a="ok">מעולה!</button>`,
      {
        ok: () => {
          this.s.pendingLevelUps.shift();
          this.store.save();
          this.closeModal();
          this.renderHud();
        },
      },
    );
  }

  // ---------------- away summary ----------------
  showAway(elapsedMs: number, ev: SimEvents) {
    const hours = elapsedMs / 3600000;
    const title = hours < 1 ? `עברו ${Math.round(elapsedMs / 60000)} דקות` : hours < 2 ? 'עברה שעה' : `עברו ${fmt(Math.floor(hours))} שעות`;
    const li = (ic: string, text: string) => `<li>${ic}<span>${text}</span></li>`;
    const img = (id: string) => `<img src="${spriteUrl(id)}" alt="">`;
    const rows: string[] = [];
    if (ev.rain) rows.push(li(icon('rain'), 'ירד גשם והשדות הושקו'));
    if (ev.heat) rows.push(li(icon('heat'), 'היה שרב – השדות התייבשו מהר יותר'));
    const prodText: Record<ProductId, (n: number) => string> = {
      egg: (n) => (n === 1 ? 'ביצה חדשה' : `${fmt(n)} ביצים חדשות`),
      wool: (n) => `${fmt(n)} ${n === 1 ? 'גיזת צמר מוכנה' : 'גיזות צמר מוכנות'}`,
      goatmilk: (n) => `${fmt(n)} ${n === 1 ? 'כד חלב עזים' : 'כדי חלב עזים'}`,
      milk: (n) => `${fmt(n)} ${n === 1 ? 'דלי חלב' : 'דליי חלב'}`,
    };
    for (const [p, n] of Object.entries(ev.products)) rows.push(li(img(`item_${p}`), prodText[p as ProductId](n!)));
    for (const b of ev.births) rows.push(li(icon('baby'), `נולד ${ANIMALS[b.type].babyName}! קוראים לו ${b.name}`));
    for (const [c, n] of Object.entries(ev.ripened)) rows.push(li(img(`item_${c}`), `${CROPS[c as CropId].name} בשל לקטיף${n! > 1 ? ` (${fmt(n!)} חלקות)` : ''}`));
    for (const t of Object.keys(ev.fruits)) rows.push(li(img(`item_${t}`), `יש ${TREES[t as TreeId].fruitName} על העצים`));
    const hungry = ev.hungry.filter((h) => this.s.entities.some((e) => e.kind === 'structure' && e.animals?.some((a) => a.name === h.name && a.hunger < 20)));
    for (const h of hungry.slice(0, 4)) rows.push(li(icon('food'), `${h.name} ה${ANIMALS[h.type].name} רעבה`));
    if (hungry.length > 4) rows.push(li(icon('food'), `ועוד ${hungry.length - 4} חיות רעבות`));
    for (const h of ev.sick.slice(0, 3)) rows.push(li(icon('sick'), `${h.name} חולה – צריך טיפול`));
    if (ev.withered) rows.push(li(icon('wilt'), `${ev.withered === 1 ? 'חלקה אחת נבלה' : `${fmt(ev.withered)} חלקות נבלו`} – צריך לנקות`));
    if (ev.dried) rows.push(li(icon('drop'), `${ev.dried === 1 ? 'חלקה אחת התייבשה' : `${fmt(ev.dried)} חלקות התייבשו`} – צריך להשקות`));
    if (!rows.length) rows.push(li(icon('sun'), 'היה שקט בחווה'));
    this.showModal(
      `<button class="x" data-a="close-modal" aria-label="סגור">${icon('close')}</button>
       <h2>${title}</h2><p>בזמן שלא היית בחווה:</p>
       <ul class="evlist">${rows.join('')}</ul>
       <button class="btn wide" data-a="close-modal">לחווה</button>`,
      { 'close-modal': () => this.closeModal() },
    );
  }

  // ---------------- refresh loop ----------------
  refresh() {
    this.renderHud();
    this.renderSheet();
    this.renderPop();
    this.scene.sync();
    this.tutorial.update();
    this.checkLevelUp();
  }

  frame() {
    this.positionPop();
    this.tutorial.position();
  }
}

