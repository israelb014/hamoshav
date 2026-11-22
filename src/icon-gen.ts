// Dev-only page used by scripts/gen-icons.mjs to compose the app icon / splash from game sprites.
import './ui/styles.css';
import { spriteUrl, getSprite } from './art/sprites';
const q = new URLSearchParams(location.search);
const size = Number(q.get('size') ?? 512);
const w = Number(q.get('w') ?? size), h = Number(q.get('h') ?? size);
const mode = q.get('mode') ?? 'icon'; // icon | round | fg | splash
const c = document.getElementById('c')!;
c.style.width = `${w}px`;
c.style.height = `${h}px`;
const bg = 'radial-gradient(circle at 50% 38%, #CDE36A 0%, #A8CF45 55%, #86B33A 100%)';
if (mode !== 'fg') c.style.background = bg;
if (mode === 'round') c.style.borderRadius = '50%';
if (mode === 'icon') c.style.borderRadius = `${size * 0.18}px`;
const place = (id: string, cx: number, by: number, scale: number) => {
  const d = getSprite(id);
  const im = document.createElement('img');
  im.src = spriteUrl(id);
  im.style.cssText = `position:absolute;width:${d.w * scale}px;height:${d.h * scale}px;left:${cx - d.w * scale * d.ox}px;top:${by - d.h * scale * d.oy}px`;
  c.appendChild(im);
};
if (mode === 'splash') {
  const s = Math.min(w, h) / 600;
  place('bld_house', w / 2 - 20 * s, h * 0.5, 1.5 * s);
  place('tree_olive_mature', w / 2 + 150 * s, h * 0.5 + 10 * s, 1.5 * s);
  const t = document.createElement('div');
  t.textContent = 'המושב';
  t.style.cssText = `position:absolute;left:0;right:0;top:${h * 0.56}px;text-align:center;font:900 ${110 * s}px Heebo;color:#fff;text-shadow:0 ${5 * s}px 0 #6E9A26`;
  c.appendChild(t);
} else {
  // foreground for adaptive icons must stay inside the inner 66% safe zone
  const k = mode === 'fg' ? 0.62 : 0.86;
  const s = (size / 300) * k;
  const cx = size / 2, base = size / 2 + 78 * s;
  place('bld_house', cx - 22 * s, base, 0.95 * s);
  place('tree_olive_mature', cx + 92 * s, base + 14 * s, 0.95 * s);
}
Promise.all([...c.querySelectorAll('img')].map((i) => i.decode())).then(() => document.fonts.ready).then(() => (document.body.dataset.ready = '1'));
