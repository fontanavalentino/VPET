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
