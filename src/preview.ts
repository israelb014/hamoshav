import { SPRITE_IDS, getSprite, spriteUrl } from './art/sprites';
const g = document.getElementById('g')!;
const filter = new URLSearchParams(location.search).get('f');
for (const id of SPRITE_IDS) {
  if (filter && !id.includes(filter)) continue;
  const d = getSprite(id);
  const c = document.createElement('div');
  c.className = 'c';
  c.innerHTML = `<img src="${spriteUrl(id)}" width="${d.w}" height="${d.h}"><div>${id}</div>`;
  g.appendChild(c);
}
