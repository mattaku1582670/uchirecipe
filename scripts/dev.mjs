import { createServer } from 'vite';
import { createViteConfig } from './vite-config.mjs';

const server = await createServer(createViteConfig());
await server.listen();
server.printUrls();
