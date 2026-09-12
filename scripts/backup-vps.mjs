import { DatabaseSync, backup } from 'node:sqlite';
import { mkdir, chmod } from 'node:fs/promises';
import path from 'node:path';
const folder = process.env.BACKUP_DIR || '/data/backups';
await mkdir(folder, { recursive: true, mode: 0o700 });
const filename = path.join(folder, 'cultogen-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sqlite');
const db = new DatabaseSync(process.env.DATABASE_PATH || '/data/cultogen.sqlite', { readOnly: true });
try { await backup(db, filename); await chmod(filename, 0o600); console.log(filename); }
finally { db.close(); }
