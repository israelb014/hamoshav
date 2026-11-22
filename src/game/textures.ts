import { SPRITE_IDS, getSprite, hasOverride, spriteUrl } from '../art/sprites';

export interface Raster {
  canvas: HTMLCanvasElement;
  ox: number;
  oy: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('image failed: ' + src.slice(0, 80)));
    img.src = src;
  });
}

/**
 * Rasterise every sprite (SVG or PNG override) into a canvas at `scale` x its logical size.
 * PNG overrides are stretched to the sprite's logical box, so they keep the same anchor.
 */
export async function rasterizeAll(scale: number, onProgress?: (p: number) => void): Promise<Map<string, Raster>> {
  const out = new Map<string, Raster>();
  let done = 0;
  const jobs = SPRITE_IDS.map(async (id) => {
    const def = getSprite(id);
    let img: HTMLImageElement;
    try {
      img = await loadImage(spriteUrl(id));
    } catch (e) {
      if (!hasOverride(id)) throw e;
      img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(def.svg)}`);
    }
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(def.w * scale));
    c.height = Math.max(1, Math.round(def.h * scale));
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    out.set(id, { canvas: c, ox: def.ox, oy: def.oy });
    done++;
    onProgress?.(done / SPRITE_IDS.length);
  });
  await Promise.all(jobs);
  return out;
}
