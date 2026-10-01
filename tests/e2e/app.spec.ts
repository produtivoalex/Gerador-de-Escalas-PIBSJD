import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';

test('delete a historical event, reload and restore a downloaded backup', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('DIREÇÃO DOS CULTOS', { exact: true })).toBeVisible();
  const backupDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Backup', exact: true }).click();
  const backup = await backupDownload;
  const backupPath = (await backup.path())!;
  const before = JSON.parse(await fs.readFile(backupPath, 'utf8')).data;
  await page.getByText('Teresa', { exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Excluir culto' }).click();
  await page.reload();
  await expect(page.getByText('Teresa', { exact: true })).toHaveCount(0);
  page.once('dialog', dialog => dialog.accept());
  await page.getByLabel('Importar arquivo de backup').setInputFiles(backupPath);
  await expect(page.getByText('Backup importado com sucesso.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Teresa', { exact: true })).toBeVisible();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('cultogen_state_v1')!));
  expect(after).toEqual(before);
});

test('mobile list supports keyboard editing and labelled controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Ver folha' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const add = page.getByRole('button', { name: 'Adicionar culto em 2/1/2026', exact: true });
  await add.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Observações', { exact: true }).fill('Teste pelo teclado');
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(audit.violations).toEqual([]);
  await page.getByRole('button', { name: 'Salvar Alterações' }).click();
  await expect(page.getByRole('button', { name: /Teste pelo teclado/ })).toBeVisible();
  await add.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(add).toBeFocused();
  await page.getByRole('button', { name: 'IA', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar painel' }).click();
  await page.screenshot({ path: testInfo.outputPath('mobile.png') });
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar.' }).click();
  const bytes = await fs.readFile((await (await downloaded).path())!);
  expect(bytes.readUInt32BE(16)).toBeGreaterThan(2500);
});

test('backup restores in another browser context and quota failure preserves saved data', async ({ page, browser }) => {
  await page.goto('/');
  const before = await page.evaluate(() => localStorage.getItem('cultogen_state_v1'));
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'cultogen_state_v1') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(page.getByText('Não foi possível salvar neste navegador.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('cultogen_state_v1'))).toBe(before);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Backup', exact: true }).click();
  const file = (await (await downloaded).path())!;
  const exported = JSON.parse(await fs.readFile(file, 'utf8')).data;
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await other.goto('http://127.0.0.1:3100');
    other.once('dialog', dialog => dialog.accept());
    await other.getByLabel('Importar arquivo de backup').setInputFiles(file);
    await expect(other.getByText('Backup importado com sucesso.')).toBeVisible();
    await other.reload();
    expect(await other.evaluate(() => JSON.parse(localStorage.getItem('cultogen_state_v1')!))).toEqual(exported);
  } finally { await context.close(); }
});

test('exports a real PNG', async ({ page }, testInfo) => {
  await page.goto('/');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar.' }).click();
  const download = await downloaded;
  const bytes = await fs.readFile((await download.path())!);
  expect(bytes.length).toBeGreaterThan(10000);
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  expect(bytes.readUInt32BE(16)).toBeGreaterThan(2500);
  await download.saveAs(testInfo.outputPath('escala.png'));
  await expect(page.getByRole('button', { name: 'Exportar.' })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('app.png'), fullPage: true });
});

test('AI edits use existing IDs and show errors without changing events', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Backup', exact: true })).toBeVisible();
  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('cultogen_state_v1')!));
  await page.route('**/api/generate', route => {
    const body = route.request().postDataJSON();
    const event = body.allEvents.find(e => e.id === 'jan-04');
    return route.fulfill({ json: { message: 'Culto atualizado', updatedEvents: [{ ...event, leader: 'Raquel' }] } });
  });
  await page.getByRole('button', { name: 'IA', exact: true }).click();
  await page.getByPlaceholder('Qual escala devo gerar?').fill('Troque Teresa por Raquel no dia 4');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByText('Culto atualizado', { exact: true })).toBeVisible();
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cultogen_state_v1')!));
  expect(saved.events.length).toBe(initial.events.length);
  expect(saved.events.find(e => e.id === 'jan-04').leader).toBe('Raquel');
  await page.route('**/api/generate', route => route.fulfill({ status: 429, json: { error: 'Limite de uso da IA atingido.' } }));
  await page.getByPlaceholder('Qual escala devo gerar?').fill('Novo pedido');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByText('Limite de uso da IA atingido.', { exact: true })).toBeVisible();
  const unchanged = await page.evaluate(() => JSON.parse(localStorage.getItem('cultogen_state_v1')!).events);
  expect(unchanged).toEqual(saved.events);
});
