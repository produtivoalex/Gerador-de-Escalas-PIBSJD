import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const access = await fs.readFile('ACESSO-VPS.local', 'utf8');
const origin = access.match(/https:\/\/[^\s]+/)[0];
const username = access.match(/Usuário: (.+)/)[1];
const password = access.match(/Senha: (.+)/)[1];
const anon = await fetch(origin + '/api/state');
assert.equal(anon.status, 401);
const login = await fetch(origin + '/api/login', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie').split(';')[0];
assert.ok(login.headers.get('set-cookie').includes('Secure'));
const headers = { cookie, origin, 'content-type': 'application/json' };
try {
  const state = await fetch(origin + '/api/state', { headers });
  assert.equal(state.status, 200);
  const before = await state.json();
  const html = await fetch(origin).then(r => r.text());
  assert.ok(html.includes('id="root"'));
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+\.(?:js|css))"/g)].map(m => m[1]);
  assert.ok(assets.length >= 2);
  for (const asset of assets) {
    const response = await fetch(origin + asset); assert.equal(response.status, 200);
    assert.equal(/AIza[\w-]{30,}/.test(await response.text()), false);
  }
  if (process.argv.includes('--check-ai')) {
    const { defaultData } = await import('../services/storage.ts');
    const response = await fetch(origin + '/api/generate', { method: 'POST', headers, body: JSON.stringify({ command: 'Teste de conectividade. Responda apenas com uma mensagem curta confirmando conexão. Não crie, altere ou exclua eventos.', allEvents: [], availablePeople: ['Pessoa de teste'], currentConfig: defaultData().config, currentMonth: '2026-09' }), signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, 'Falha na verificação real da IA: HTTP ' + response.status);
    const data = await response.json(); assert.equal(typeof data.message, 'string');
    console.log('Gemini real respondeu; resposta não aplicada a nenhuma escala.');
  }
  const after = await fetch(origin + '/api/state', { headers }).then(r => r.json());
  assert.deepEqual(after, before);
  console.log('Produção validada: login, cookie seguro, API privada, assets e preservação dos dados.');
} finally {
  await fetch(origin + '/api/logout', { method: 'POST', headers, body: '{}' });
}
