import { icon } from '../art/icons';
import { spriteUrl } from '../art/sprites';
import {
  ADULT_MS, ANIMALS, ANIMAL_IDS, CROPS, CROP_IDS, DECOS, DECO_IDS, ITEM_IDS, LAND_STAGES, SEASON_NAMES, STRUCTURES,
  TREAT_COST, TREES, TREE_IDS, itemName, plotPrice, storageUpgradePrice, STORAGE_STEP,
  type AnimalId, type CropId, type DecoKind, type ItemId, type StructureKind, type TreeId,
} from '../sim/data';
import { animalRemaining, canPlant, isRipe, plotCount, plotRemaining, speedUpCost } from '../sim/actions';
import { quoteSale, trend, unitPrice } from '../sim/market';
import { isFriday, seasonOf } from '../sim/season';
import { taskText } from '../sim/tasks';
import { allAnimals, findEntity, storageUsed, type Animal, type Plot, type StructureEntity } from '../sim/state';
import { exportSave, parseImport, clearSave } from '../platform/save';
import { createInitialState } from '../sim/state';
import { setSound } from './sound';
import { esc, fmt, fmtAge, fmtDur, fmtShort, ring } from './util';
import type { UI } from './ui';

const price = (n: number, cls = '') => `<span class="price ${cls}">${icon('coin')}<span class="num">${fmt(n)}</span></span>`;
const lockBadge = (lvl: number) => `<span class="lockbadge">${icon('lock')}רמה ${lvl}</span>`;

// ======================= SHOP =======================
type ShopTab = 'buildings' | 'animals' | 'trees' | 'decor';
let shopTab: ShopTab = 'buildings';

export function openShop(ui: UI, tab?: ShopTab) {
  if (tab) shopTab = tab;
  const s = () => ui.s;
  const card = (o: { a: string; v: string; img: string; name: string; desc: string; cost: number; level: number; extra?: string }) => {
    const locked = s().level < o.level;
    return `<button class="card shopcard ${locked ? 'locked' : ''}" data-a="${o.a}" data-v="${o.v}">
      ${locked ? lockBadge(o.level) : ''}
      <div class="art"><img src="${spriteUrl(o.img)}" alt=""></div>
      <div class="nm">${o.name}</div><div class="ds">${o.desc}</div>${o.extra ?? ''}${price(o.cost)}</button>`;
  };
  const after = (r: { ok: boolean; id?: unknown }, msg: string) => {
    if (!r.ok) return;
    ui.closeSheet();
    ui.toast(msg, true);
    ui.sfx('coin');
    if (typeof r.id === 'number') setTimeout(() => ui.scene.focus(r.id as number), 50);
  };
  ui.openSheet({
    id: 'shop',
    title: () => 'חנות',
    head: () =>
      `<div class="tabs">${([['buildings', 'מבנים'], ['animals', 'חיות'], ['trees', 'עצים'], ['decor', 'קישוטים']] as const)
        .map(([k, l]) => `<button class="${shopTab === k ? 'on' : ''}" data-a="tab" data-v="${k}">${l}</button>`).join('')}</div>`,
    body: () => {
      const st = s();
      if (shopTab === 'buildings') {
        const next = LAND_STAGES[st.landStage + 1];
        const cards = [
          card({ a: 'plot', v: '', img: 'plot_dry', name: 'חלקת שדה', desc: `יש לך ${plotCount(st)} חלקות`, cost: plotPrice(plotCount(st)), level: 1 }),
          ...(Object.keys(STRUCTURES) as StructureKind[]).filter((k) => STRUCTURES[k].buyable).map((k) => {
            const d = STRUCTURES[k];
            const owned = st.entities.filter((e) => e.kind === 'structure' && e.type === k).length;
            return card({ a: 'struct', v: k, img: `bld_${k}`, name: d.name, desc: d.desc + (owned ? ` · בבעלותך: ${owned}` : ''), cost: d.price, level: d.level });
          }),
        ];
        if (next) cards.push(card({ a: 'land', v: '', img: 'tile_grass_spring_0', name: 'הרחבת אדמה', desc: `הגדלת החווה ל-${next.size}×${next.size}`, cost: next.price, level: next.level }));
        return `<div class="grid">${cards.join('')}</div>`;
      }
      if (shopTab === 'animals')
        return `<div class="grid">${ANIMAL_IDS.map((a) => {
          const d = ANIMALS[a];
          const homes = d.building.map((b) => STRUCTURES[b].name).join(' / ');
          return card({ a: 'animal', v: a, img: `animal_${a}`, name: d.name, desc: `גרה ב${homes} · ${itemName(d.product)} כל ${fmtShort(d.productMs)}`, cost: d.price, level: d.level });
        }).join('')}</div>`;
      if (shopTab === 'trees')
        return `<div class="grid">${TREE_IDS.map((t) => {
          const d = TREES[t];
          return card({ a: 'tree', v: t, img: `tree_${t}_fruit`, name: d.name, desc: `${d.fruitName} כל ${fmtShort(d.fruitMs)} · ב${d.seasons.map((x) => SEASON_NAMES[x]).join(' ו')}`, cost: d.price, level: d.level });
        }).join('')}</div>`;
      return `<div class="grid">${DECO_IDS.map((k) => {
        const d = DECOS[k];
        return card({ a: 'deco', v: k, img: `deco_${k}`, name: d.name, desc: 'משמח חיות ברדיוס 3', cost: d.price, level: d.level });
      }).join('')}</div>`;
    },
    on: {
      tab: (el) => {
        shopTab = el.dataset.v as ShopTab;
        ui.renderSheet();
      },
      plot: () => after(ui.store.act('buyPlot'), 'חלקה חדשה נוספה לחווה'),
      struct: (el) => after(ui.store.act('buyStructure', el.dataset.v as StructureKind), `${STRUCTURES[el.dataset.v as StructureKind].name} נבנה! אפשר להזיז במצב עריכה`),
      land: () => after(ui.store.act('expandLand'), 'החווה גדלה!'),
      animal: (el) => {
        const r = ui.store.act('buyAnimal', el.dataset.v as AnimalId, Date.now());
        if (r.ok) {
          ui.closeSheet();
          ui.toast(`${ANIMALS[el.dataset.v as AnimalId].name} חדשה הגיעה לחווה`, true);
          setTimeout(() => ui.scene.focus(r.building as number), 50);
        }
      },
      tree: (el) => after(ui.store.act('buyTree', el.dataset.v as TreeId), `${TREES[el.dataset.v as TreeId].name} נשתל`),
      deco: (el) => after(ui.store.act('buyDeco', el.dataset.v as DecoKind), `${DECOS[el.dataset.v as DecoKind].name} הוצב בחווה`),
    },
  });
}

// ======================= STORAGE =======================
export function openStorage(ui: UI) {
  ui.openSheet({
    id: 'storage',
    title: () => 'מחסן',
    sub: () => `<span class="num">${fmt(storageUsed(ui.s))}/${fmt(ui.s.storage.cap)}</span>`,
    body: () => {
      const s = ui.s;
      const used = storageUsed(s);
      const items = ITEM_IDS.filter((i) => (s.storage.items[i] ?? 0) > 0);
      const up = storageUpgradePrice(s.storage.upgrades);
      return `<div class="capbar ${used >= s.storage.cap ? 'full' : ''}"><i style="width:${Math.min(100, (used / s.storage.cap) * 100)}%"></i></div>
        <p class="ver" style="margin:-6px 0 10px">שדרוג מוסיף ${STORAGE_STEP} מקומות</p>
        ${items.length ? `<div class="grid items">${items.map((i) => `<div class="card itemcard"><span class="q num">${fmt(s.storage.items[i]!)}</span><img src="${spriteUrl(`item_${i}`)}" alt=""><span class="nm">${itemName(i)}</span></div>`).join('')}</div>` : '<div class="empty">המחסן ריק. קטפו גידולים ואספו תוצרת מהחיות.</div>'}
        <div style="margin-top:14px" class="rowbtns">
          <button class="btn orange" data-a="upgrade">${icon('storage')}שדרג מחסן · ${icon('coin')}${fmt(up)}</button>
          <button class="btn blue" data-a="market">${icon('market')}לשוק</button>
        </div>`;
    },
    on: {
      upgrade: () => {
        const r = ui.store.act('upgradeStorage');
        if (r.ok) ui.toast('המחסן שודרג!', true);
      },
      market: () => openMarket(ui),
    },
  });
}

// ======================= MARKET =======================
const qtys = new Map<ItemId, number>();
const bunting = () => {
  const cols = ['#E8574A', '#FFE15A', '#5DBB46', '#3AA0E0', '#F39A2B'];
  let s = '<svg class="bunting" viewBox="0 0 360 18" preserveAspectRatio="none"><path d="M0,2 Q180,10 360,2" stroke="#fff" stroke-width="1.5" fill="none"/>';
  for (let i = 0; i < 18; i++) s += `<path d="M${i * 20 + 2},${3 + Math.sin((i / 17) * Math.PI) * 4} l8,12 l8,-12z" fill="${cols[i % 5]}"/>`;
  return s + '</svg>';
};

export function openMarket(ui: UI) {
  ui.openSheet({
    id: 'market',
    title: () => 'שוק איכרים',
    body: () => {
      const s = ui.s;
      const now = Date.now();
      const fri = isFriday(now);
      const sorted = [...ITEM_IDS].sort((a, b) => ((s.storage.items[b] ?? 0) > 0 ? 1 : 0) - ((s.storage.items[a] ?? 0) > 0 ? 1 : 0));
      const stalls = sorted.map((id) => {
        const have = s.storage.items[id] ?? 0;
        const q = Math.min(Math.max(1, qtys.get(id) ?? 1), Math.max(1, have));
        const tr = trend(s, id);
        const total = have ? quoteSale(s, id, q, now) : 0;
        return `<div class="card stall ${fri ? 'fri' : ''}" id="stall-${id}">
          <div class="awn"></div>
          <div class="crate"><img src="${spriteUrl(`item_${id}`)}" alt=""></div>
          <div class="info">
            <div class="row"><span class="nm">${itemName(id)}</span><span class="trend">${icon(tr > 0 ? 'up' : tr < 0 ? 'down' : 'flat')}</span></div>
            <div class="row">${price(unitPrice(s, id, now))}<span class="have">במחסן: <span class="num">${fmt(have)}</span></span></div>
            ${have ? `<div class="qty"><button data-a="qminus" data-v="${id}" aria-label="פחות">${icon('minus')}</button><span class="n num">${fmt(q)}</span><button data-a="qplus" data-v="${id}" aria-label="יותר">${icon('plus')}</button><button class="all" data-a="qall" data-v="${id}">הכל</button></div>
            <button class="btn small" data-a="sell" data-v="${id}">מכור · ${icon('coin')}${fmt(total)}</button>` : '<button class="btn small" disabled>אין במחסן</button>'}
          </div></div>`;
      });
      return `${fri ? `<div class="friday">${bunting()}שוק שישי!<small>כל המחירים גבוהים ב-20% היום</small></div>` : ''}<div class="stalls">${stalls.join('')}</div>`;
    },
    on: {
      qminus: (el) => {
        const id = el.dataset.v as ItemId;
        qtys.set(id, Math.max(1, (qtys.get(id) ?? 1) - 1));
        ui.renderSheet();
      },
      qplus: (el) => {
        const id = el.dataset.v as ItemId;
        qtys.set(id, Math.min(ui.s.storage.items[id] ?? 1, (qtys.get(id) ?? 1) + 1));
        ui.renderSheet();
      },
      qall: (el) => {
        const id = el.dataset.v as ItemId;
        qtys.set(id, ui.s.storage.items[id] ?? 1);
        ui.renderSheet();
      },
      sell: (el) => {
        const id = el.dataset.v as ItemId;
        const have = ui.s.storage.items[id] ?? 0;
        const q = Math.min(Math.max(1, qtys.get(id) ?? 1), have);
        const rect = el.getBoundingClientRect();
        const r = ui.store.act('sell', id, q, Date.now());
        if (r.ok) {
          qtys.set(id, 1);
          ui.fly({ x: rect.left + rect.width / 2, y: rect.top }, icon('coin'), 'coins', Math.ceil(q / 2) + 2, `+${fmt(r.coins as number)}`);
        }
      },
    },
  });
}

// ======================= TASKS =======================
export function openTasks(ui: UI) {
  ui.openSheet({
    id: 'tasks',
    title: () => 'משימות יומיות',
    body: () => {
      const s = ui.s;
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      const icons = { harvest: 'basket', collect: 'basket', sell: 'coin', feed: 'food', plant: 'shovel' } as const;
      return (
        s.tasks.list.map((t) => {
          const done = t.progress >= t.n;
          return `<div class="card task ${t.claimed ? 'done' : ''}">
            <div class="top">${t.target && t.type !== 'sell' ? `<img src="${spriteUrl(`item_${t.target}`)}" alt="" width="40" height="40">` : icon(icons[t.type])}<span class="tx">${taskText(t)}</span>
            ${t.claimed ? icon('check') : done ? `<button class="btn small orange" data-a="claim" data-v="${t.id}">קבל</button>` : ''}</div>
            <div class="prog"><i style="width:${(t.progress / t.n) * 100}%"></i><span class="num">${fmt(t.progress)}/${fmt(t.n)}</span></div>
            <div class="rewards"><span class="r">${icon('coin')}<span class="num">${fmt(t.coins)}</span></span><span class="r">${icon('star')}<span class="num">${t.xp}</span></span>${t.diamonds ? `<span class="r">${icon('diamond')}<span class="num">${t.diamonds}</span></span>` : ''}</div>
          </div>`;
        }).join('') + `<div class="ver">משימות חדשות בעוד ${fmtDur(midnight - now.getTime())}</div>`
      );
    },
    on: {
      claim: (el) => {
        const rect = el.getBoundingClientRect();
        const t = ui.s.tasks.list.find((x) => x.id === Number(el.dataset.v));
        const r = ui.store.act('claimTask', Number(el.dataset.v));
        if (r.ok && t) {
          const at = { x: rect.left + rect.width / 2, y: rect.top };
          ui.fly(at, icon('coin'), 'coins', 4, `+${fmt(t.coins)}`);
          setTimeout(() => ui.fly(at, icon('star'), 'xp'), 150);
          if (t.diamonds) setTimeout(() => ui.fly(at, icon('diamond'), 'diamonds'), 300);
        }
      },
    },
  });
}

// ======================= SETTINGS =======================
export function openSettings(ui: UI) {
  ui.openSheet({
    id: 'settings',
    title: () => 'הגדרות',
    body: () => `
      <div class="card setrow">${icon('sound')}<span class="lbl">צלילים<small>אפקטים קוליים קצרים</small></span><button class="switch ${ui.s.settings.sound ? 'on' : ''}" data-a="sound" aria-label="צלילים"></button></div>
      <div class="card setrow">${icon('download')}<span class="lbl">ייצוא שמירה<small>שמירת ההתקדמות לקובץ JSON</small></span><button class="btn small blue" data-a="export">ייצוא</button></div>
      <div class="card setrow">${icon('upload')}<span class="lbl">ייבוא שמירה<small>טעינת התקדמות מקובץ</small></span><button class="btn small" data-a="import">ייבוא</button></div>
      <div class="card setrow">${icon('reset')}<span class="lbl">איפוס משחק<small>מחיקת כל ההתקדמות</small></span><button class="btn small red" data-a="reset">איפוס</button></div>
      <input type="file" accept="application/json,.json" id="importfile" hidden>
      <div class="ver">המושב · גרסה 1.0 · השמירה נשמרת במכשיר בלבד</div>`,
    on: {
      sound: () => {
        ui.s.settings.sound = !ui.s.settings.sound;
        setSound(ui.s.settings.sound);
        ui.store.save();
        ui.sfx('tap');
        ui.renderSheet();
      },
      export: async () => {
        try {
          ui.toast(await exportSave(ui.s), true);
        } catch (e) {
          ui.toast('הייצוא נכשל');
          console.error(e);
        }
      },
      import: () => {
        const inp = document.getElementById('importfile') as HTMLInputElement;
        inp.value = '';
        inp.onchange = async () => {
          const f = inp.files?.[0];
          if (!f) return;
          try {
            const st = parseImport(await f.text());
            ui.confirm('ייבוא שמירה', `לטעון חווה ברמה ${st.level} עם ${fmt(st.coins)} מטבעות? ההתקדמות הנוכחית תוחלף.`, 'טען', () => {
              ui.store.replace(st);
              ui.closeSheet();
              ui.toast('השמירה נטענה', true);
            });
          } catch {
            ui.toast('הקובץ אינו שמירה תקינה של המושב');
          }
        };
        inp.click();
      },
      reset: () =>
        ui.confirm('איפוס משחק', 'בטוח שרוצים להתחיל מחדש?', 'כן, להמשיך', () =>
          ui.confirm('אישור אחרון', 'כל ההתקדמות תימחק לצמיתות. למחוק?', 'מחק הכל', async () => {
            await clearSave();
            ui.store.replace(createInitialState(Date.now()));
            ui.closeSheet();
            ui.tutorial.restart();
            ui.toast('המשחק אופס');
          }, true),
        ),
    },
  });
}

// ======================= PLANTING =======================
function cropCards(ui: UI, greenhouse: boolean): string {
  const s = ui.s;
  const now = Date.now();
  const season = seasonOf(now);
  return `<div class="hscroll" data-scroll="crops">${CROP_IDS.map((c) => {
    const d = CROPS[c];
    const why = canPlant(s, c, now, greenhouse);
    const locked = s.level < d.level;
    const offSeason = !greenhouse && !d.seasons.includes(season);
    const off = locked || offSeason;
    return `<button class="card cropcard ${off ? 'off' : ''}" data-a="plant" data-v="${c}">
      <img class="art" src="${spriteUrl(`item_${c}`)}" alt="">
      <span class="nm">${d.name}</span>
      <div class="meta">${ring(Math.min(1, d.growMs / (8 * 3600000)), '#5DBB46', fmtShort(d.growMs).replace(' ', '<br>'))}${price(d.seed)}</div>
      ${locked ? `<span class="why">${icon('lock')}רמה ${d.level}</span>` : offSeason ? `<span class="why">${icon('lock')}לא בעונה</span>` : why ? `<span class="why">${why}</span>` : `<span class="why" style="color:var(--green-d)">מכירה: ${fmt(d.sell)}</span>`}
    </button>`;
  }).join('')}</div>`;
}

export function openPlant(ui: UI, plotId: number) {
  ui.openSheet({
    id: 'plant',
    title: () => 'שתילה',
    sub: () => `עונה: ${SEASON_NAMES[seasonOf(Date.now())]}`,
    body: () => cropCards(ui, false),
    on: {
      plant: (el) => {
        const r = ui.store.act('plant', plotId, el.dataset.v as CropId, Date.now());
        if (r.ok) {
          ui.closeSheet();
          ui.scene.pulse(plotId);
        }
      },
    },
  });
}

// ======================= GREENHOUSE =======================
let ghPlantSlot: number | null = null;
export function openGreenhouse(ui: UI, id: number) {
  ghPlantSlot = null;
  const plots = () => (findEntity(ui.s, id) as StructureEntity | undefined)?.plots ?? [];
  const slotHtml = (p: Plot, i: number) => {
    if (!p.crop) return `<button class="card slot" data-a="slot" data-v="${i}"><img src="${spriteUrl('plot_wet')}" alt=""><span class="nm">חלקה ריקה</span><span class="sm">הקישו לשתילה</span></button>`;
    const d = CROPS[p.crop];
    if (p.withered) return `<button class="card slot" data-a="slot" data-v="${i}"><img src="${spriteUrl('crop_withered')}" alt=""><span class="nm">נבל</span><span class="sm">הקישו לניקוי</span></button>`;
    if (isRipe(p)) return `<button class="card slot" data-a="slot" data-v="${i}"><img src="${spriteUrl(`crop_${p.crop}_stage3`)}" alt=""><span class="nm">${d.name}</span><span class="btn small">קטוף</span></button>`;
    const rem = plotRemaining(p);
    const st = p.grow / d.growMs >= 0.5 ? 2 : p.grow / d.growMs >= 0.15 ? 1 : 0;
    return `<div class="card slot"><img src="${spriteUrl(`crop_${p.crop}_stage${st}`)}" alt=""><span class="nm">${d.name}</span><span class="sm">${fmtDur(rem)}</span><button class="btn small blue" data-a="ghspeed" data-v="${i}">${icon('bolt')}האץ ${icon('diamond')}${speedUpCost(rem)}</button></div>`;
  };
  ui.openSheet({
    id: 'greenhouse',
    title: () => 'חממה',
    sub: () => 'כל גידול, בכל עונה, בלי ייבוש',
    body: () => (ghPlantSlot !== null ? `<p style="font-weight:700;margin:0 0 6px">בחרו גידול לחלקה ${ghPlantSlot + 1}:</p>${cropCards(ui, true)}<button class="btn white small" data-a="ghback">חזרה</button>` : `<div class="slots">${plots().map(slotHtml).join('')}</div>`),
    on: {
      slot: (el) => {
        const i = Number(el.dataset.v);
        const p = plots()[i];
        if (!p.crop) {
          ghPlantSlot = i;
          ui.renderSheet();
        } else if (p.withered) ui.store.act('clearPlot', id, i);
        else if (isRipe(p)) {
          const rect = el.getBoundingClientRect();
          const r = ui.store.act('harvest', id, i);
          ui.rewardFx(id, r, { x: rect.left + rect.width / 2, y: rect.top + 30 });
        }
      },
      plant: (el) => {
        if (ghPlantSlot === null) return;
        const r = ui.store.act('plant', id, el.dataset.v as CropId, Date.now(), ghPlantSlot);
        if (r.ok) {
          ghPlantSlot = null;
          ui.renderSheet();
        }
      },
      ghback: () => {
        ghPlantSlot = null;
        ui.renderSheet();
      },
      ghspeed: (el) => ui.store.act('speedUpPlot', id, Number(el.dataset.v)),
    },
  });
}

// ======================= BUILDING (coop / pen / barn) =======================
const bar = (v: number, c: string) => `<div class="mini"><i style="width:${v}%;background:${c}"></i></div>`;
function statusIcons(a: Animal): string {
  let s = '';
  if (a.sick) s += icon('sick');
  if (a.ready) s += `<img src="${spriteUrl(`item_${ANIMALS[a.type].product}`)}" alt="" width="22" height="22">`;
  if (a.hunger < 20) s += icon('food');
  if (a.age < ADULT_MS) s += icon('baby');
  return s;
}

export function openBuilding(ui: UI, id: number) {
  const b = () => findEntity(ui.s, id) as StructureEntity | undefined;
  ui.openSheet({
    id: 'building',
    title: () => (b() ? STRUCTURES[b()!.type].name : ''),
    sub: () => {
      const e = b();
      return e ? `<span class="num">${e.animals?.length ?? 0}/${STRUCTURES[e.type].capacity}</span>` : '';
    },
    body: () => {
      const e = b();
      if (!e) return '';
      const animals = e.animals ?? [];
      const kinds = ANIMAL_IDS.filter((a) => ANIMALS[a].building.includes(e.type as never));
      const food = [...new Set(kinds.flatMap((k) => ANIMALS[k].food))].map((c) => `${CROPS[c].name}: ${fmt(ui.s.storage.items[c] ?? 0)}`).join(' · ');
      return `<div class="rowbtns">
          <button class="btn orange" data-a="feedall">${icon('food')}האכל את כולן</button>
          <button class="btn" data-a="collectall">${icon('basket')}אסוף הכל</button>
        </div>
        <p class="ver" style="margin:-4px 0 10px">אוכל במחסן – ${food}</p>
        ${animals.length ? `<div class="alist">${animals.map((a) => `<button class="card arow" data-a="animal" data-v="${a.id}"><img src="${spriteUrl(`animal_${a.type}`)}" alt="" style="${a.age < ADULT_MS ? 'transform:scale(.7)' : ''}"><div class="mid"><span class="nm">${esc(a.name)}</span>${bar(Math.round(a.hunger / 5) * 5, a.hunger < 20 ? '#E8574A' : '#F39A2B')}</div><span class="st">${statusIcons(a)}</span></button>`).join('')}</div>` : '<div class="empty">אין כאן חיות עדיין</div>'}
        <div style="margin-top:12px"><button class="btn blue wide" data-a="buy">${icon('shop')}קנה עוד חיות</button></div>`;
    },
    on: {
      feedall: () => {
        const r = ui.store.act('feedAll', id);
        if (r.ok) ui.toast(`האכלת ${r.count as number} חיות`, true);
      },
      collectall: (el) => {
        const rect = el.getBoundingClientRect();
        const r = ui.store.act('collectAll', id);
        ui.rewardFx(id, r, { x: rect.left + rect.width / 2, y: rect.top });
        if (r.ok && r.msg) ui.toast(r.msg as string);
      },
      animal: (el) => openAnimal(ui, Number(el.dataset.v)),
      buy: () => openShop(ui, 'animals'),
    },
  });
}

// ======================= ANIMAL DETAIL =======================
export function openAnimal(ui: UI, animalId: number) {
  const find = () => allAnimals(ui.s).find((x) => x.a.id === animalId);
  ui.openSheet({
    id: 'animal',
    title: () => {
      const f = find();
      return f ? ANIMALS[f.a.type].name : '';
    },
    body: () => {
      const f = find();
      if (!f) return '';
      const a = f.a;
      const def = ANIMALS[a.type];
      const adult = a.age >= ADULT_MS;
      const rem = animalRemaining(a);
      const canPet = Date.now() - a.lastPet >= 3600000;
      let prod: string;
      if (!adult) prod = `${def.babyName} – יגדל בעוד ${fmtDur(ADULT_MS - a.age)}`;
      else if (a.sick) prod = 'חולה – לא מניבה';
      else if (a.ready) prod = `${itemName(def.product)} מוכן לאיסוף!`;
      else if (a.hunger < 20) prod = 'רעבה – לא מניבה';
      else prod = `${itemName(def.product)} בעוד ${fmtDur(rem / (a.happiness >= 70 ? 1.1 : 1))}`;
      return `<div class="animal-head">
          <img src="${spriteUrl(`animal_${a.type}`)}" alt="" style="${adult ? '' : 'transform:scale(.7)'}">
          <div class="namefield"><input id="aname" maxlength="16" value="${esc(a.name)}" aria-label="שם"><button class="btn small white" data-a="rename">שמור</button></div>
          <span class="agechip">גיל: ${fmtAge(a.age)}${adult ? '' : ` · ${def.babyName}`}</span>
        </div>
        <div class="stats3">
          <div class="stat">${ring(a.hunger / 100, a.hunger < 20 ? '#E8574A' : '#F39A2B', icon('food'), '#F3E3C8', 5)}שובע ${Math.round(a.hunger)}</div>
          <div class="stat">${ring(a.health / 100, '#5DBB46', icon(a.sick ? 'sick' : 'heart'), '#F3E3C8', 5)}בריאות ${Math.round(a.health)}</div>
          <div class="stat">${ring(a.happiness / 100, '#FFC93C', icon('smile'), '#F3E3C8', 5)}שמחה ${Math.round(a.happiness)}</div>
        </div>
        <div class="actions4">
          <button class="btn orange" data-a="feed">${icon('food')}האכל</button>
          <button class="btn blue" data-a="collect" ${a.ready ? '' : 'disabled'}><img src="${spriteUrl(`item_${def.product}`)}" alt="" width="28" height="28">אסוף</button>
          <button class="btn red" data-a="treat" ${a.sick ? '' : 'disabled'}>${icon('sick')}טפל · ${TREAT_COST}</button>
          <button class="btn" data-a="pet" ${canPet ? '' : 'disabled'}>${icon('hand')}לטף</button>
        </div>
        <div class="prodline">${prod}${adult && !a.ready && !a.sick && a.hunger >= 20 ? `<button class="btn small blue" data-a="aspeed">${icon('bolt')}האץ ${icon('diamond')}${speedUpCost(rem)}</button>` : ''}</div>
        <p class="ver">אוכל: ${def.food.map((c) => CROPS[c].name).join(' או ')} · ${canPet ? 'אפשר ללטף' : `ליטוף הבא בעוד ${fmtDur(3600000 - (Date.now() - a.lastPet))}`}</p>`;
    },
    on: {
      feed: () => {
        const r = ui.store.act('feed', animalId);
        if (r.ok) ui.toast('ממממ, טעים!', true);
      },
      collect: (el) => {
        const f = find();
        const rect = el.getBoundingClientRect();
        const r = ui.store.act('collect', animalId);
        if (f) ui.rewardFx(f.b.id, r, { x: rect.left + rect.width / 2, y: rect.top });
      },
      treat: () => {
        const r = ui.store.act('treat', animalId);
        if (r.ok) ui.toast('הטיפול הצליח – בריאה ושמחה', true);
      },
      pet: (el) => {
        const r = ui.store.act('pet', animalId, Date.now());
        if (r.ok) {
          const rect = el.getBoundingClientRect();
          ui.floatText({ x: rect.left + rect.width / 2, y: rect.top }, '+10 שמחה');
          ui.sfx('animal');
        }
      },
      rename: () => {
        const v = (document.getElementById('aname') as HTMLInputElement).value;
        (document.activeElement as HTMLElement | null)?.blur();
        const r = ui.store.act('rename', animalId, v);
        if (r.ok) ui.toast('השם נשמר', true);
      },
      aspeed: () => ui.store.act('speedUpAnimal', animalId),
    },
  });
}
