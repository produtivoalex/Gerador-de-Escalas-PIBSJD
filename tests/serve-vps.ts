import { scryptSync } from 'node:crypto';
import { createAppServer } from '../server/vps';
const salt = 'b'.repeat(32);
createAppServer({ APP_ORIGIN: 'http://127.0.0.1:3200', ADMIN_USERNAME: 'test-user', ADMIN_PASSWORD_HASH: salt + ':' + scryptSync('test-password', salt, 64).toString('hex'), DATABASE_PATH: ':memory:' }).listen(3200, '127.0.0.1');
