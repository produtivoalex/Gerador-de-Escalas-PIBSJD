import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { aiApiPlugin } from './server/vitePlugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GROQ_');
  return {
    server: { port: 3000, host: '127.0.0.1' },
    plugins: [react(), aiApiPlugin({
      GROQ_API_KEY: process.env.GROQ_API_KEY || env.GROQ_API_KEY,
      GROQ_MODEL: process.env.GROQ_MODEL || env.GROQ_MODEL
    })],
    resolve: { alias: { '@': path.resolve(__dirname, '.') } }
  };
});
