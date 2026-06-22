import { build } from 'vite';
import { createViteConfig } from './vite-config.mjs';

await build(createViteConfig());
