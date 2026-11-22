import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Virtual module listing PNG overrides found in public/sprites (id without extension).
function spriteOverrides(): Plugin {
  const id = 'virtual:sprite-overrides';
  const resolved = '\0' + id;
  return {
    name: 'sprite-overrides',
    resolveId(src) {
      return src === id ? resolved : null;
    },
    load(src) {
      if (src !== resolved) return null;
      const dir = resolve(__dirname, 'public/sprites');
      const ids = existsSync(dir)
        ? readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4))
        : [];
      return `export default ${JSON.stringify(ids)};`;
    },
  };
}

export default defineConfig({
  base: process.env.BUILD_TARGET === 'android' ? './' : '/hamoshav/',
  plugins: [spriteOverrides()],
  build: {
    chunkSizeWarningLimit: 2000,
  },
  test: {
    env: { TZ: 'Asia/Jerusalem' },
    include: ['tests/**/*.test.ts'],
  },
});
