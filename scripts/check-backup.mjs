import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
const db = new DatabaseSync(process.argv[2], { readOnly: true });
try {
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  const states = db.prepare('SELECT version, data FROM states').all();
  for (const state of states) { assert.ok(state.version > 0); JSON.parse(state.data); }
  console.log('Snapshot SQLite íntegro e legível. Contas com escalas:', states.length);
} finally { db.close(); }
