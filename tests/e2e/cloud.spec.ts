import { test, expect } from '@playwright/test';

test('login, automatic sync across devices, conflict, version restore and logout', async ({ browser }) => {
  const first = await browser.newContext(), second = await browser.newContext();
  try {
    const a = await first.newPage(), b = await second.newPage();
    for (const page of [a, b]) {
      await page.goto('http://127.0.0.1:3200');
      await page.getByLabel('Usuário', { exact: true }).fill('test-user');
      await page.getByLabel('Senha', { exact: true }).fill('test-password');
      await page.getByRole('button', { name: 'Entrar', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Backup', exact: true })).toBeVisible();
      await expect(page.getByText('Sincronizado · versão 1', { exact: true })).toBeVisible({ timeout: 15000 });
    }
    await b.route('**/api/state', route => route.abort());
    await b.getByRole('button', { name: 'Próximo mês' }).click();
    await a.getByRole('button', { name: 'Mês anterior' }).click();
    await expect(a.getByText('Sincronizado · versão 2', { exact: true })).toBeVisible({ timeout: 15000 });
    await b.unroute('**/api/state');
    await expect(b.getByRole('button', { name: 'Usar versão da nuvem' })).toBeVisible({ timeout: 15000 });
    b.once('dialog', dialog => dialog.accept());
    await b.getByRole('button', { name: 'Usar versão da nuvem' }).click();
    await expect(b.getByText('Sincronizado · versão 2', { exact: true })).toBeVisible({ timeout: 15000 });
    expect(await b.evaluate(() => JSON.parse(localStorage.getItem('cultogen_state_v1')!).lastDate)).toEqual(await a.evaluate(() => JSON.parse(localStorage.getItem('cultogen_state_v1')!).lastDate));
    await a.getByRole('button', { name: 'Histórico', exact: true }).click();
    a.once('dialog', dialog => dialog.accept());
    await a.getByRole('button', { name: /^Versão 1 ·/ }).click();
    await expect(a.getByText('Sincronizado · versão 3', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(b.getByText('Sincronizado · versão 3', { exact: true })).toBeVisible({ timeout: 15000 });
    await b.reload();
    await expect(b.getByRole('button', { name: 'Histórico', exact: true })).toBeVisible();
    b.once('dialog', dialog => dialog.accept());
    await b.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(b.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
    expect((await b.request.get('http://127.0.0.1:3200/api/state')).status()).toBe(401);
  } finally { await first.close(); await second.close(); }
});
