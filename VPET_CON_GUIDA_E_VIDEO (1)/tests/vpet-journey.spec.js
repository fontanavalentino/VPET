import { test, expect } from '@playwright/test';

const paths = [
  ['Sto pensando a un animale', 'adopt'],
  ['Ho già un animale', 'care'],
  ['Ho bisogno di aiuto', 'sos'],
  ['Voglio scoprire il mondo pet', 'culture'],
  ['Un momento difficile', 'rainbow']
];

for (const [label] of paths) {
  test(`percorso: ${label}`, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Quante volte ti è successo?', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: label }).click();
    await expect(page.getByRole('button', { name: /Torna alla Home VPet/i })).toBeVisible();
    const visibleText = await page.locator('body').innerText();
    expect(visibleText.length).toBeGreaterThan(500);
    expect(visibleText).not.toMatch(/lorem ipsum|coming soon|da compilare|contenuto in arrivo|placeholder/i);
    await page.getByRole('button', { name: /Torna alla Home VPet/i }).click();
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  });
}

test('crawl dei pulsanti visibili: nessun vicolo cieco evidente', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ho già un animale' }).click();
  const buttons = page.locator('button:visible');
  const count = Math.min(await buttons.count(), 35);
  const problems = [];
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    const text = (await btn.innerText().catch(() => '')).trim();
    if (!text || /Torna alla Home VPet/i.test(text)) continue;
    const before = await page.locator('body').innerText();
    await btn.click({ timeout: 1500 }).catch(() => null);
    await page.waitForTimeout(180);
    const after = await page.locator('body').innerText();
    const changed = before !== after;
    if (!changed && !/menu|chiudi|close/i.test(text)) problems.push(text.slice(0, 80));
    await page.keyboard.press('Escape').catch(() => null);
  }
  expect(problems, `Pulsanti senza risposta evidente: ${problems.join(', ')}`).toEqual([]);
});

test('area razze non deve risultare generica o vuota', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ho già un animale' }).click();
  const razze = page.getByText(/razze/i).first();
  if (await razze.isVisible().catch(() => false)) {
    await razze.click().catch(() => null);
    await page.waitForTimeout(250);
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/da compilare|generico|placeholder|contenuto in arrivo/i);
    expect(text.length).toBeGreaterThan(700);
  }
});
