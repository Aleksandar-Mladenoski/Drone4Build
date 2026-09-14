import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { games } from './games.mjs';

for (const game of games) {
  console.log(`Building ${game.code}...`);
  await build({
    configFile: false,
    root: resolve('apps', game.id),
    base: './',
    plugins: game.code === 'M1.2' ? [react()] : [],
    build: { outDir: resolve('dist/apps', game.id), emptyOutDir: true }
  });
}
