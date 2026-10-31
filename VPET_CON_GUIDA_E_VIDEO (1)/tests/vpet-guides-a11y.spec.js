import { test, expect } from '@playwright/test';

// Verifica le guide pubbliche senza modificare dati o stato utente.
const guidePaths = ['/adozioni', '/salute-benessere', '/razze'];

for (const guide of guidePaths) {
  test(`guida accessibile: ${guide}`, async ({ page }) => {
    await page.goto(guide);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('a.brand')).toHaveAttribute('href', '/');
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? getComputedStyle(el).outlineStyle : 'none';
    });
    expect(focus).not.toBe('none');
  });
}

test('CTA guida utilizzabile su viewport mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/adozioni');
  const cta = page.locator('a.cta');
  await expect(cta).toBeVisible();
  const box = await cta.boundingBox();
  expect(box).toBeTruthy();
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(376);
});

test('navigazione guida non mostra contenuto orizzontalmente tagliato', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/adozioni');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('Home: quattro azioni principali leggibili e raggiungibili', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Vai alla dashboard' }).click();
  const nav = page.getByRole('navigation', { name: 'Servizi principali VPET' });
  await expect(nav).toBeVisible();
  const labels = ['Apri Pet SOS', 'Apri Adozioni', 'Apri Vicino a me', 'Apri Eventi'];
  for (const label of labels) {
    const button = nav.getByRole('button', { name: label });
    await expect(button).toBeVisible();
    const rect = await button.boundingBox();
    expect(rect.height).toBeGreaterThanOrEqual(44);
  }
  await nav.getByRole('button', { name: 'Apri Pet SOS' }).click();
  await expect(page.locator('.modal.show')).toBeVisible();
});

test('Pet SOS: Escape chiude la finestra e riporta il focus sul pulsante', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Vai alla dashboard' }).click();
  const button = page.getByRole('navigation', { name: 'Servizi principali VPET' }).getByRole('button', { name: 'Apri Pet SOS' });
  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Contenuti VPET' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('#sheet')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
});

test('Adozioni: finestra apribile e chiudibile con tastiera', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Vai alla dashboard' }).click();
  const button = page.getByRole('navigation', { name: 'Servizi principali VPET' }).getByRole('button', { name: 'Apri Adozioni' });
  await button.click();
  await expect(page.getByRole('dialog', { name: 'Contenuti VPET' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Contenuti VPET' })).toBeHidden();
});
