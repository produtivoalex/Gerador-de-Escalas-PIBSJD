import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { aiApiPlugin } from './server/vitePlugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GEMINI_');
  return {
    server: { port: 3000, host: '127.0.0.1' },
    plugins: [react(), aiApiPlugin({
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || env.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL || env.GEMINI_MODEL
    })],
    resolve: { alias: { '@': path.resolve(__dirname, '.') } }
  };
});
