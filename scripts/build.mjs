import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { createViteConfig } from './vite-config.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

await build(createViteConfig());

// GitHub Pages は SPA フォールバックを行わないため、未知のパス（/share 等）でも
// アプリが配信されるよう index.html を 404.html として複製する。
await copyFile(resolve(projectRoot, 'dist/index.html'), resolve(projectRoot, 'dist/404.html'));
