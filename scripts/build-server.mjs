import { build } from 'esbuild';
await build({ entryPoints: ['server/vps.ts'], outfile: 'dist-server/server.mjs', bundle: true, platform: 'node', target: 'node24', format: 'esm' });
console.log('Servidor VPS gerado.');
