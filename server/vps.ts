import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, readState, writeState, consumeQuota } from './database';
import { parseAppData } from '../services/validation';
import { handleAIRequest } from './api';
import { createLoginCodeSender, type SendLoginCode } from './email';

const derive = promisify(scrypt);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const MAX_BYTES = 15_000_000;
const codeDigest = (pepper: string, code: string) => createHmac('sha256', pepper).update(code).digest();
const constantEqual = (a: Uint8Array, b: Uint8Array) => a.length === b.length && timingSafeEqual(a, b);

export function createAppServer(env: NodeJS.ProcessEnv = process.env, sendCode: SendLoginCode = createLoginCodeSender(env), clock: () => number = Date.now, generateCode: () => string = () => String(randomInt(0, 1000000)).padStart(6, '0')) {
  const origin = env.APP_ORIGIN;
  if (!origin || !/^https?:\/\//.test(origin) || new URL(origin).origin !== origin) throw new Error('Configure APP_ORIGIN com a origem exata do aplicativo.');
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(env.ADMIN_USERNAME || '') ||
      (env.RECOVERY_EMAIL || '').toLowerCase() !== 'produtivoalex@gmail.com' || !/^[a-f\d]{64}$/i.test(env.OTP_PEPPER || ''))
    throw new Error('Configure ADMIN_USERNAME, RECOVERY_EMAIL e OTP_PEPPER.');
  const filename = env.DATABASE_PATH || './runtime/cultogen.sqlite';
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const db = openDatabase(filename);
  try { db.exec("ALTER TABLE sessions ADD COLUMN purpose TEXT NOT NULL DEFAULT 'legacy'"); } catch { /* already migrated */ }
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
        const now = clock();
        db.prepare('DELETE FROM sessions WHERE expires < ?').run(now);
        const token = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith('cultogen_session='))?.slice(17) || '';
        const session = token ? db.prepare('SELECT owner, purpose FROM sessions WHERE token = ? AND expires > ?').get(hash(token), now) : undefined;
        if (pathname === '/api/session' && req.method === 'GET') {
          const profile = db.prepare('SELECT pin_hash, email_verified FROM credentials WHERE owner=?').get(env.ADMIN_USERNAME);
          const active = session?.purpose === 'app' || session?.purpose === 'setup';
          const recoveryEmail = profile?.email_verified ? env.RECOVERY_EMAIL!.replace(/^(.{2})[^@]*(@.*)$/, '$1••••$2') : null;
          send(res, 200, { enabled: true, username: active && session?.purpose === 'app' ? session.owner : null,
            setupRequired: !profile?.pin_hash, setupSession: active && session?.purpose === 'setup', recoveryEmail }); return;
        }
        if (pathname === '/api/login' && req.method === 'POST') {
          if (!consumeQuota(db, 'login', `login:${Math.floor(now / 900000)}`, 30)) { send(res, 429, { error: 'Muitas tentativas. Aguarde 15 minutos.' }); return; }
          const input = await body(req);
          db.prepare('INSERT OR IGNORE INTO credentials(owner) VALUES (?)').run(env.ADMIN_USERNAME);
          const profile = db.prepare('SELECT pin_hash, failed_pins FROM credentials WHERE owner=?').get(env.ADMIN_USERNAME)!;
          if (!profile.pin_hash) { send(res, 428, { error: 'Confirme seu email para configurar o PIN.', setupRequired: true }); return; }
          if (Number(profile.failed_pins) >= 3) { send(res, 401, { error: 'Você errou 3 vezes. Confirme seu email para entrar.', recoveryAvailable: true }); return; }
          const pin = typeof input?.pin === 'string' ? input.pin : '';
          let valid = false;
          if (/^\d{4}$/.test(pin)) {
            const [salt, expected] = String(profile.pin_hash).split(':');
            valid = constantEqual(await derive(pin, salt, 64) as Buffer, Buffer.from(expected, 'hex'));
          }
          if (!valid) {
            const failed = Number(profile.failed_pins) + 1;
            db.prepare('UPDATE credentials SET failed_pins=? WHERE owner=?').run(failed, env.ADMIN_USERNAME);
            send(res, 401, { error: failed >= 3 ? 'Você errou 3 vezes. Confirme seu email para entrar.' : 'PIN incorreto.', recoveryAvailable: failed >= 3, attemptsRemaining: Math.max(0, 3 - failed) }); return;
          }
          db.prepare('UPDATE credentials SET failed_pins=0 WHERE owner=?').run(env.ADMIN_USERNAME);
          const newToken = randomBytes(32).toString('hex');
          db.prepare('INSERT INTO sessions(token,owner,expires,purpose) VALUES (?,?,?,?)').run(hash(newToken), env.ADMIN_USERNAME, now + 7 * 86400000, 'app');
          res.setHeader('Set-Cookie', cookie(newToken, 7 * 86400)); send(res, 200, { username: env.ADMIN_USERNAME }); return;
        }
        if (pathname === '/api/email/send' && req.method === 'POST') {
          const input = await body(req), purpose = input?.purpose === 'setup' ? 'setup' : 'recovery';
          db.prepare('INSERT OR IGNORE INTO credentials(owner) VALUES (?)').run(env.ADMIN_USERNAME);
          const profile = db.prepare('SELECT pin_hash,failed_pins,otp_sent_at,otp_window,otp_sends FROM credentials WHERE owner=?').get(env.ADMIN_USERNAME)!;
          if ((purpose === 'setup' && profile.pin_hash) || (purpose === 'recovery' && Number(profile.failed_pins) < 3)) {
            send(res, 200, { message: 'Se a confirmação estiver disponível, um código foi solicitado.' }); return;
          }
          const previousWindow = Number(profile.otp_window);
          const windowStart = previousWindow > now - 3600000 ? previousWindow : now;
          const sends = windowStart === previousWindow ? Number(profile.otp_sends) : 0;
          if (sends >= 3 || now - Number(profile.otp_sent_at) < 60000) { send(res, 429, { error: 'Aguarde antes de solicitar outro código.' }); return; }
          const code = generateCode();
          db.prepare(`UPDATE credentials SET otp_hash=?,otp_expires=?,otp_attempts=0,otp_sent_at=?,otp_window=?,otp_sends=?,otp_purpose=? WHERE owner=?`)
            .run(codeDigest(env.OTP_PEPPER!, code).toString('hex'), now + 600000, now, windowStart, sends + 1, purpose, env.ADMIN_USERNAME);
          try { await sendCode(env.RECOVERY_EMAIL!, code); }
          catch { db.prepare('UPDATE credentials SET otp_hash=NULL,otp_expires=0 WHERE owner=?').run(env.ADMIN_USERNAME); send(res, 503, { error: 'Não foi possível enviar o email. Tente mais tarde.' }); return; }
          send(res, 200, { message: 'Código enviado ao email cadastrado. Ele expira em 10 minutos.' }); return;
        }
        if (pathname === '/api/email/verify' && req.method === 'POST') {
          const input = await body(req), value = typeof input?.code === 'string' ? input.code : '';
          const profile = db.prepare('SELECT otp_hash,otp_expires,otp_attempts,otp_purpose FROM credentials WHERE owner=?').get(env.ADMIN_USERNAME);
          if (!/^\d{6}$/.test(value) || !profile?.otp_hash || Number(profile.otp_expires) < now || Number(profile.otp_attempts) >= 5) {
            send(res, 401, { error: 'Código inválido ou expirado. Solicite outro.' }); return;
          }
          if (!constantEqual(Buffer.from(String(profile.otp_hash), 'hex'), codeDigest(env.OTP_PEPPER!, value))) {
            const attempts = Number(profile.otp_attempts) + 1;
            db.prepare(`UPDATE credentials SET otp_attempts=?,otp_hash=CASE WHEN ? >= 5 THEN NULL ELSE otp_hash END,
              otp_expires=CASE WHEN ? >= 5 THEN 0 ELSE otp_expires END WHERE owner=?`).run(attempts, attempts, attempts, env.ADMIN_USERNAME);
            send(res, 401, { error: attempts >= 5 ? 'Limite de códigos atingido. Solicite outro email.' : 'Código incorreto.' }); return;
          }
          const setup = profile.otp_purpose === 'setup';
          db.prepare("UPDATE credentials SET email_verified=1,failed_pins=0,otp_hash=NULL,otp_expires=0,otp_attempts=0,otp_purpose='' WHERE owner=?").run(env.ADMIN_USERNAME);
          const newToken = randomBytes(32).toString('hex'), lifetime = setup ? 600 : 604800;
          db.prepare('INSERT INTO sessions(token,owner,expires,purpose) VALUES (?,?,?,?)').run(hash(newToken), env.ADMIN_USERNAME, now + lifetime * 1000, setup ? 'setup' : 'app');
          res.setHeader('Set-Cookie', cookie(newToken, lifetime)); send(res, 200, { username: env.ADMIN_USERNAME, setupRequired: setup }); return;
        }
        if (pathname === '/api/pin/set' && req.method === 'POST') {
          const role = token ? db.prepare('SELECT purpose FROM sessions WHERE token=? AND owner=? AND expires>?').get(hash(token), env.ADMIN_USERNAME, now) : undefined;
          if (role?.purpose !== 'setup') { send(res, 401, { error: 'Confirme o email para configurar o PIN.' }); return; }
          const input = await body(req);
          if (typeof input?.pin !== 'string' || !/^\d{4}$/.test(input.pin) || input.pin !== input.confirmation) {
            send(res, 400, { error: 'Informe duas vezes o mesmo PIN de quatro dígitos.' }); return;
          }
          const salt = randomBytes(16).toString('hex'), pinHash = salt + ':' + (await derive(input.pin, salt, 64) as Buffer).toString('hex');
          db.prepare('UPDATE credentials SET pin_hash=?,failed_pins=0 WHERE owner=? AND email_verified=1').run(pinHash, env.ADMIN_USERNAME);
          db.prepare("UPDATE sessions SET purpose='app',expires=? WHERE token=?").run(now + 7 * 86400000, hash(token));
          db.prepare('DELETE FROM sessions WHERE owner=? AND token<>?').run(env.ADMIN_USERNAME, hash(token));
          res.setHeader('Set-Cookie', cookie(token, 7 * 86400)); send(res, 200, { username: env.ADMIN_USERNAME }); return;
        }
        if (pathname === '/api/logout' && req.method === 'POST' && session) {
          db.prepare('DELETE FROM sessions WHERE token = ?').run(hash(token));
          res.setHeader('Set-Cookie', cookie('', 0)); send(res, 200, { ok: true }); return;
        }
        if (!session || session.purpose !== 'app') { send(res, 401, { error: 'Confirme sua identidade para sincronizar.' }); return; }
        const owner = String(session.owner);
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
