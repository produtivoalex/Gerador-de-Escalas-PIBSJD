import { DatabaseSync } from 'node:sqlite';
import type { AppData } from '../types';

export function openDatabase(filename: string) {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS states (owner TEXT PRIMARY KEY, version INTEGER NOT NULL, data TEXT NOT NULL, updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS versions (owner TEXT NOT NULL, version INTEGER NOT NULL, data TEXT NOT NULL, updated TEXT NOT NULL, PRIMARY KEY(owner, version));
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS credentials (
      owner TEXT PRIMARY KEY, pin_hash TEXT, email_verified INTEGER NOT NULL DEFAULT 0,
      failed_pins INTEGER NOT NULL DEFAULT 0, otp_hash TEXT, otp_expires INTEGER NOT NULL DEFAULT 0,
      otp_attempts INTEGER NOT NULL DEFAULT 0, otp_sent_at INTEGER NOT NULL DEFAULT 0,
      otp_window INTEGER NOT NULL DEFAULT 0, otp_sends INTEGER NOT NULL DEFAULT 0,
      otp_purpose TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS usage (owner TEXT NOT NULL, bucket TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(owner, bucket));`);
  return db;
}

export function readState(db: DatabaseSync, owner: string) {
  const row = db.prepare('SELECT version, data, updated FROM states WHERE owner = ?').get(owner);
  return row ? { version: Number(row.version), data: JSON.parse(String(row.data)) as AppData, updated: String(row.updated) } : { version: 0, data: null, updated: null };
}

export function writeState(db: DatabaseSync, owner: string, version: number, data: AppData) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const current = readState(db, owner);
    if (current.version !== version) { db.exec('ROLLBACK'); return null; }
    const next = { version: version + 1, data, updated: new Date().toISOString() };
    const raw = JSON.stringify(data);
    db.prepare('INSERT INTO states VALUES (?, ?, ?, ?) ON CONFLICT(owner) DO UPDATE SET version=excluded.version, data=excluded.data, updated=excluded.updated')
      .run(owner, next.version, raw, next.updated);
    db.prepare('INSERT INTO versions VALUES (?, ?, ?, ?)').run(owner, next.version, raw, next.updated);
    db.prepare('DELETE FROM versions WHERE owner = ? AND version <= ?').run(owner, next.version - 30);
    db.exec('COMMIT');
    return next;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function consumeQuota(db: DatabaseSync, owner: string, bucket: string, limit: number) {
  const result = db.prepare(`INSERT INTO usage VALUES (?, ?, 1) ON CONFLICT(owner, bucket)
    DO UPDATE SET count=count+1 WHERE count < ? RETURNING count`).get(owner, bucket, limit);
  return !!result;
}
