import { createAppServer } from '../server/vps';
createAppServer({ APP_ORIGIN: 'http://127.0.0.1:3200', ADMIN_USERNAME: 'test-user', RECOVERY_EMAIL: 'produtivoalex@gmail.com', OTP_PEPPER: 'c'.repeat(64), DATABASE_PATH: ':memory:' }, async () => {}, Date.now, () => '123456').listen(3200, '127.0.0.1');
