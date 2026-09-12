import test from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
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

test('VPS requires login, rejects CSRF, synchronizes with revision checks, limits AI and invalidates logout', async () => {
  const salt = 'a'.repeat(32), password = 'test-only-password';
  const origin = 'http://127.0.0.1:3199';
  const server = createAppServer({ APP_ORIGIN: origin, ADMIN_USERNAME: 'alex', ADMIN_PASSWORD_HASH: salt + ':' + scryptSync(password, salt, 64).toString('hex'), DATABASE_PATH: ':memory:', AI_DAILY_LIMIT: '1' });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + (server.address() as any).port;
  let cookie = '';
  const call = (url: string, method = 'GET', data?: unknown, requestOrigin = origin) => fetch(base + url, { method, headers: { 'Content-Type': 'application/json', origin: requestOrigin, cookie }, ...(data ? { body: JSON.stringify(data) } : {}) });
  try {
    assert.equal((await call('/api/state')).status, 401);
    assert.equal((await call('/api/generate', 'POST', {})).status, 401);
    assert.equal((await call('/api/login', 'POST', { username: 'alex', password }, 'https://evil.example')).status, 403);
    assert.equal((await call('/api/login', 'POST', { username: 'alex', password: 'wrong' })).status, 401);
    const login = await call('/api/login', 'POST', { username: 'alex', password });
    assert.equal(login.status, 200); cookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.ok(login.headers.get('set-cookie')!.includes('HttpOnly'));
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
    assert.equal((await call('/api/logout', 'POST', {})).status, 200);
    assert.equal((await call('/api/state')).status, 401);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
