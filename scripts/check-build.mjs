import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), 'GEMINI_');
const key = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
function files(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(folder, entry.name);
    return entry.isDirectory() ? files(filename) : [filename];
  });
}
const assets = files('dist').filter(file => /\.(js|html)$/.test(file));
for (const file of assets) {
  const content = fs.readFileSync(file, 'utf8');
  if ((key && key !== 'sua_chave_aqui' && content.includes(key)) || /AIza[\w-]{30,}/.test(content)) {
    throw new Error('A build contém uma credencial; não publique.');
  }
}
console.log('Verificação concluída: nenhuma chave Gemini encontrada nos arquivos públicos.');
