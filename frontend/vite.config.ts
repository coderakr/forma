import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { parseEnv } from './src/lib/env.ts';
export default defineConfig(({ mode }) => {
  const env = parseEnv(loadEnv(mode, process.cwd(), 'VITE_'));
  return {
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    plugins: [react(), tailwindcss()],
    server: { port: env.VITE_DEV_PORT, strictPort: true },
    preview: { port: env.VITE_DEV_PORT, strictPort: true },
  };
});
