import { preview } from 'vite';
import { createViteConfig } from './vite-config.mjs';

const server = await preview(createViteConfig());
server.printUrls();
