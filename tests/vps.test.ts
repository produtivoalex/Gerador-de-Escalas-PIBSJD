import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes, scryptSync } from 'node:crypto';
import { createAppServer } from '../server/vps';
import { defaultData } from '../services/storage';
import { openDatabase, writeState, readState } from '../server/database';
import { backup } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('SQLite online backup restores schedules and versions in an independent database', async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'cultogen-backup-'));
  const db = openDatabase(':memory:');
  try {
    writeState(db, 'alex', 0, defaultData());
    const filename = path.join(folder, 'backup.sqlite');
    await backup(db, filename);
    const restored = openDatabase(filename);
    try {
      assert.deepEqual(readState(restored, 'alex'), readState(db, 'alex'));
      assert.equal(restored.prepare('PRAGMA integrity_check').get()?.integrity_check, 'ok');
    } finally { restored.close(); }
  } finally {
    db.close();
    assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(folder).startsWith('cultogen-backup-'));
    await rm(folder, { recursive: true, force: true });
  }
});

test('SQLite rejects stale edits and keeps the last 30 restorable versions isolated by owner', () => {
  const db = openDatabase(':memory:');
  try {
    const data = defaultData();
    assert.equal(writeState(db, 'alex', 0, data)?.version, 1);
    assert.equal(writeState(db, 'alex', 0, { ...data, events: [] }), null);
    assert.deepEqual(readState(db, 'alex').data, data);
    assert.equal(readState(db, 'other').version, 0);
    for (let version = 1; version < 33; version++) writeState(db, 'alex', version, { ...data, people: ['Pessoa ' + version] });
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM versions').get()?.n, 30);
    assert.equal(readState(db, 'alex').version, 33);
  } finally { db.close(); }
});

test('PIN setup, three-failure email recovery, CSRF, sync, quotas, version history and logout', async () => {
  const origin = 'http://127.0.0.1:3199';
  const pepper = 'c'.repeat(64); let emailedCode = '', now = Date.now();
  const server = createAppServer({ APP_ORIGIN: origin, ADMIN_USERNAME: 'alex', RECOVERY_EMAIL: 'produtivoalex@gmail.com', OTP_PEPPER: pepper, DATABASE_PATH: ':memory:', AI_DAILY_LIMIT: '1' }, async (address, code) => { assert.equal(address, 'produtivoalex@gmail.com'); emailedCode = code; }, () => now);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + (server.address() as any).port;
  let cookie = '';
  const call = (url: string, method = 'GET', data?: unknown, requestOrigin = origin) => fetch(base + url, { method, headers: { 'Content-Type': 'application/json', origin: requestOrigin, cookie }, ...(data ? { body: JSON.stringify(data) } : {}) });
  try {
    assert.equal((await call('/api/state')).status, 401);
    assert.equal((await call('/api/generate', 'POST', {})).status, 401);
    assert.equal((await call('/api/login', 'POST', { pin: '1234' }, 'https://evil.example')).status, 403);
    assert.equal((await (await call('/api/session')).json()).setupRequired, true);
    assert.equal((await call('/api/email/send', 'POST', { purpose: 'setup' })).status, 200);
    const wrongCode = await call('/api/email/verify', 'POST', { code: '000000' });
    if (emailedCode !== '000000') assert.equal(wrongCode.status, 401);
    const verify = await call('/api/email/verify', 'POST', { code: emailedCode });
    assert.equal(verify.status, 200); assert.equal((await verify.json()).setupRequired, true);
    cookie = verify.headers.get('set-cookie')!.split(';')[0]; assert.ok(verify.headers.get('set-cookie')!.includes('HttpOnly'));
    assert.equal((await call('/api/pin/set', 'POST', { pin: '0426', confirmation: '9999' })).status, 400);
    assert.equal((await call('/api/pin/set', 'POST', { pin: '0426', confirmation: '0426' })).status, 200);
    const logoutSetup = await call('/api/logout', 'POST', {}); assert.equal(logoutSetup.status, 200); cookie = '';
    now += 61000;
    for (let attempt = 0; attempt < 3; attempt++) assert.equal((await call('/api/login', 'POST', { pin: '9999' })).status, 401);
    const denied = await call('/api/login', 'POST', { pin: '0426' }); assert.equal((await denied.json()).recoveryAvailable, true);
    assert.equal((await call('/api/email/send', 'POST', { purpose: 'recovery' })).status, 200);
    const recovery = await call('/api/email/verify', 'POST', { code: emailedCode }); assert.equal(recovery.status, 200);
    cookie = recovery.headers.get('set-cookie')!.split(';')[0]; assert.ok(recovery.headers.get('set-cookie')!.includes('Secure') === false);
    assert.equal((await call('/api/session').then(r => r.json())).username, 'alex');
    const data = defaultData();
    assert.equal((await call('/api/state', 'PUT', { version: 0, data })).status, 200);
    assert.equal((await call('/api/state', 'PUT', { version: 0, data: { ...data, events: [] } })).status, 409);
    assert.deepEqual((await call('/api/state').then(r => r.json())).data, data);
    assert.equal((await call('/api/state', 'PUT', { version: 1, data: {} })).status, 400);
    assert.equal((await call('/api/versions').then(r => r.json())).length, 1);
    assert.deepEqual((await call('/api/versions/1').then(r => r.json())).data, data);
    assert.equal((await call('/api/generate', 'POST', {})).status, 400);
    assert.equal((await call('/api/generate', 'POST', {})).status, 429);
    assert.equal((await call('/api/logout', 'POST', {})).status, 200); cookie = '';
    assert.equal((await call('/api/state')).status, 401);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
