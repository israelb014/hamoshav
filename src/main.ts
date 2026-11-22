import Phaser from 'phaser';
import './ui/styles.css';
import { createInitialState } from './sim/state';
import { emptyEvents } from './sim/sim';
import { MIN } from './sim/data';
import { loadSave, writeSave } from './platform/save';
import { Store } from './game/store';
import { rasterizeAll } from './game/textures';
import { FarmScene } from './scenes/FarmScene';
import { UI } from './ui/ui';

const AWAY_THRESHOLD = 5 * MIN;

async function boot() {
  const bar = document.querySelector('#loading .bar i') as HTMLElement;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const baseZoom = Math.min(innerWidth / 900, innerHeight / 620, 1.25);
  const texScale = Math.max(0.5, Math.min(2, Math.round(baseZoom * 1.5 * dpr * 4) / 4));

  const [rasters, saved] = await Promise.all([
    rasterizeAll(texScale, (p) => (bar.style.width = `${Math.round(p * 100)}%`)),
    loadSave(),
  ]);

  const now = Date.now();
  const state = saved ?? createInitialState(now);
  const store = new Store(state);
  const elapsed = now - state.lastTick;
  const offlineEvents = store.tick(now, emptyEvents());
  writeSave(store.s);

  let ui: UI | null = null;
  const scene = new FarmScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#86B03A',
    scale: { mode: Phaser.Scale.NONE, width: innerWidth * dpr, height: innerHeight * dpr, zoom: 1 / dpr },
    render: { antialias: true, roundPixels: false },
    input: { touch: { capture: true } },
    disableContextMenu: true,
    banner: false,
  });
  game.scene.add('farm', scene, true, {
    store,
    rasters,
    texScale,
    dpr,
    cb: {
      onTap: (t: Parameters<UI['handleTap']>[0]) => ui?.handleTap(t),
      onMove: (id: number, x: number, y: number) => {
        const e = store.s.entities.find((en) => en.id === id);
        if (e && (e.x !== x || e.y !== y)) store.act('moveEntity', id, x, y);
      },
    },
  });

  await new Promise<void>((res) => {
    const check = () => (scene.sys && scene.sys.isActive() && (scene as unknown as { views: Map<number, unknown> }).views.size ? res() : requestAnimationFrame(check));
    check();
  });

  ui = new UI(store, scene);
  (window as unknown as { __hamoshav: unknown }).__hamoshav = { store, scene, ui };
  ui.refresh();
  if (saved && elapsed > AWAY_THRESHOLD) ui.showAway(elapsed, offlineEvents);

  const loading = document.getElementById('loading')!;
  loading.classList.add('hide');
  setTimeout(() => loading.remove(), 500);

  // live simulation tick + periodic save
  setInterval(() => {
    if (document.hidden) return;
    store.tick();
    store.emit();
  }, 1000);
  setInterval(() => store.save(), 10_000);

  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      store.tick();
      store.save();
    } else {
      const away = Date.now() - (hiddenAt || Date.now());
      const ev = store.tick(Date.now(), emptyEvents());
      store.save();
      store.emit();
      if (away > AWAY_THRESHOLD) ui?.showAway(away, ev);
    }
  });
  window.addEventListener('pagehide', () => store.save());

  const loop = () => {
    ui?.frame();
    requestAnimationFrame(loop);
  };
  loop();

  window.addEventListener('resize', () => {
    game.scale.resize(innerWidth * dpr, innerHeight * dpr);
    game.scale.setZoom(1 / dpr);
  });
}

boot().catch((e) => {
  console.error(e);
  const l = document.getElementById('loading');
  if (l) l.insertAdjacentHTML('beforeend', `<p style="color:#fff;font-weight:700">שגיאה בטעינת המשחק</p>`);
});
