import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, readState, writeState, consumeQuota } from './database';
import { parseAppData } from '../services/validation';
import { handleAIRequest } from './api';

const derive = promisify(scrypt);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const MAX_BYTES = 15_000_000;

export function createAppServer(env: NodeJS.ProcessEnv = process.env) {
  const origin = env.APP_ORIGIN;
  if (!origin || !/^https?:\/\//.test(origin) || new URL(origin).origin !== origin) throw new Error('Configure APP_ORIGIN com a origem exata do aplicativo.');
  if (!env.ADMIN_USERNAME || !/^[a-f\d]{32}:[a-f\d]{128}$/i.test(env.ADMIN_PASSWORD_HASH || '')) throw new Error('Configure ADMIN_USERNAME e ADMIN_PASSWORD_HASH antes de iniciar.');
  const filename = env.DATABASE_PATH || './runtime/cultogen.sqlite';
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const db = openDatabase(filename);
  const root = path.resolve(env.STATIC_DIR || './dist');
  const secure = origin.startsWith('https://');
  const cookie = (token: string, maxAge: number) => `cultogen_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  const limit = (name: string, fallback: number) => { const value = Number(env[name]); return Number.isInteger(value) && value > 0 ? value : fallback; };

  function send(res: ServerResponse, status: number, value: unknown) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  }
  async function body(req: IncomingMessage) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Envie JSON.'), { status: 415 });
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BYTES) throw Object.assign(new Error('Dados excedem o limite de 15 MB.'), { status: 413 });
      chunks.push(Buffer.from(chunk));
    }
    try { return JSON.parse(Buffer.concat(chunks).toString()); }
    catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
  }
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    const pathname = new URL(req.url || '/', origin).pathname;
    try {
      if (pathname === '/api/health') { send(res, 200, { status: 'ok' }); return; }
      if (pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method || '') && (req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site')) {
          send(res, 403, { error: 'Origem não permitida.' }); return;
        }
        const now = Date.now();
        db.prepare('DELETE FROM sessions WHERE expires < ?').run(now);
        const token = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith('cultogen_session='))?.slice(17) || '';
        const session = token ? db.prepare('SELECT owner FROM sessions WHERE token = ? AND expires > ?').get(hash(token), now) : undefined;
        if (pathname === '/api/session' && req.method === 'GET') {
          send(res, 200, { enabled: true, username: session?.owner || null }); return;
        }
        if (pathname === '/api/login' && req.method === 'POST') {
          // Bound expensive password checks even when clients forge proxy headers.
          if (!consumeQuota(db, 'login', `login:${Math.floor(now / 900000)}`, 30)) { send(res, 429, { error: 'Muitas tentativas. Aguarde 15 minutos.' }); return; }
          const input = await body(req);
          if (typeof input?.username !== 'string' || typeof input?.password !== 'string' || input.password.length > 256) { send(res, 400, { error: 'Dados de acesso inválidos.' }); return; }
          const [salt, expected] = env.ADMIN_PASSWORD_HASH!.split(':');
          const actual = await derive(input.password, salt, 64) as Buffer;
          if (!timingSafeEqual(actual, Buffer.from(expected, 'hex')) || input.username !== env.ADMIN_USERNAME) { send(res, 401, { error: 'Usuário ou senha incorretos.' }); return; }
          const newToken = randomBytes(32).toString('hex');
          db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hash(newToken), input.username, now + 7 * 86400000);
          res.setHeader('Set-Cookie', cookie(newToken, 7 * 86400)); send(res, 200, { username: input.username }); return;
        }
        if (!session) { send(res, 401, { error: 'Entre novamente para sincronizar.' }); return; }
        const owner = String(session.owner);
        if (pathname === '/api/logout' && req.method === 'POST') {
          db.prepare('DELETE FROM sessions WHERE token = ?').run(hash(token));
          res.setHeader('Set-Cookie', cookie('', 0)); send(res, 200, { ok: true }); return;
        }
        if (pathname === '/api/state' && req.method === 'GET') { send(res, 200, readState(db, owner)); return; }
        if (pathname === '/api/state' && req.method === 'PUT') {
          const input = await body(req);
          if (!Number.isSafeInteger(input?.version) || input.version < 0) { send(res, 400, { error: 'Versão inválida.' }); return; }
          let data; try { data = parseAppData(input.data); } catch { send(res, 400, { error: 'Escala inválida. Nenhum dado foi substituído.' }); return; }
          const saved = writeState(db, owner, input.version, data);
          if (!saved) { send(res, 409, { error: 'Outra edição foi salva. Escolha a versão que deseja manter.', ...readState(db, owner) }); return; }
          send(res, 200, saved); return;
        }
        if (pathname === '/api/versions' && req.method === 'GET') {
          send(res, 200, db.prepare('SELECT version, updated FROM versions WHERE owner = ? ORDER BY version DESC LIMIT 30').all(owner)); return;
        }
        if (/^\/api\/versions\/\d+$/.test(pathname) && req.method === 'GET') {
          const row = db.prepare('SELECT version, data, updated FROM versions WHERE owner = ? AND version = ?').get(owner, Number(pathname.split('/').pop()));
          send(res, row ? 200 : 404, row ? { ...row, data: JSON.parse(String(row.data)) } : { error: 'Versão não encontrada.' }); return;
        }
        if (pathname === '/api/generate' && req.method === 'POST') {
          const hour = new Date(now).toISOString().slice(0, 13), day = hour.slice(0, 10);
          if (!consumeQuota(db, owner, `day:${day}`, limit('AI_DAILY_LIMIT', 100)) || !consumeQuota(db, owner, `hour:${hour}`, limit('AI_HOURLY_LIMIT', 20))) {
            send(res, 429, { error: 'Limite de pedidos da IA atingido. Aguarde para tentar novamente.' }); return;
          }
          const input = await body(req);
          const response = await handleAIRequest(new Request(origin + pathname, { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(input) }), env);
          res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return;
        }
        send(res, 404, { error: 'Recurso não encontrado.' }); return;
      }
      if (!['GET', 'HEAD'].includes(req.method || '')) { send(res, 405, { error: 'Método não permitido.' }); return; }
      // Retire the previous static deployment's service worker without caching this app.
      if (pathname === '/sw.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
        res.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>self.registration.unregister()).then(()=>self.clients.matchAll()).then(cs=>cs.forEach(c=>c.navigate(c.url)))));"); return;
      }
      const relative = decodeURIComponent(pathname).replace(/^\/+/, '');
      let filename = path.resolve(root, relative || 'index.html');
      if (filename !== root && !filename.startsWith(root + path.sep)) { send(res, 404, { error: 'Recurso não encontrado.' }); return; }
      try { if (!(await stat(filename)).isFile()) filename = path.join(root, 'index.html'); }
      catch { if (path.extname(relative)) { send(res, 404, { error: 'Arquivo não encontrado.' }); return; } filename = path.join(root, 'index.html'); }
      const content = await readFile(filename);
      const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
      res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (!res.headersSent) send(res, (error as any)?.status || 500, { error: (error as any)?.status ? (error as Error).message : 'Falha no servidor. Seus dados locais foram preservados.' });
      else res.end();
    }
  });
  server.requestTimeout = 60000;
  server.headersTimeout = 15000;
  const cleanup = setInterval(() => {
    db.prepare("DELETE FROM usage WHERE bucket < ? AND bucket LIKE 'day:%'").run('day:' + new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
    db.prepare("DELETE FROM usage WHERE bucket < ? AND bucket LIKE 'hour:%'").run('hour:' + new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 13));
    db.prepare("DELETE FROM usage WHERE bucket LIKE 'login:%' AND bucket != ?").run(`login:${Math.floor(Date.now() / 900000)}`);
  }, 3600000);
  cleanup.unref();
  server.on('close', () => { clearInterval(cleanup); db.close(); });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createAppServer();
  server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('CultoGen iniciado.'));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
}
