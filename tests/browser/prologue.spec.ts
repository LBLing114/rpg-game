import { test, expect, type Page } from '@playwright/test';
import story from '../../src/data/storyData.json' with { type: 'json' };

async function start(page: Page) {
  await page.goto('/');
  await page.locator('#title-screen [data-action="new-story"]').click();
}
async function reveal(page: Page) {
  if (!await page.locator('.choices').isVisible()) await page.locator('[data-action="advance"]').click();
  await expect(page.locator('.choices')).toBeVisible();
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('wudu-save-v1')!));
}

test('six dated prologue pages precede exploration and complete with the first objective', async ({ page }) => {
  await start(page);
  const initial = (await saved(page)).state;
  for (const [i, entry] of story.prologue.entries()) {
    await expect(page.locator('#dialogue')).toHaveAttribute('data-node', entry.node);
    await expect(page.locator('.prologue-heading')).toHaveText(entry.title.zh);
    await expect(page.locator('.prologue-period')).toHaveText(entry.period.zh);
    await expect(page.locator('.prologue-counter')).toContainText(`${String(i + 1).padStart(2, '0')} / 06`);
    await expect(page.locator('#scene-caption')).toBeHidden();
    await expect(page.locator('#hotspots')).toBeHidden();
    await expect(page.locator('.portrait')).toHaveCount(0);
    await page.keyboard.press('ArrowRight', { delay: 50 });
    expect((await saved(page)).state.x).toBe(initial.x);
    await reveal(page);
    if (i === 0) {
      await expect(page.locator('.typing-visible')).toContainText('文化大革命');
      const text = await page.locator('.typing-visible').textContent();
      expect((text!.match(/[\u4e00-\u9fff]/g) || []).length).toBeGreaterThanOrEqual(500);
      expect(await page.locator('#world').evaluate(el => getComputedStyle(el).visibility)).toBe('hidden');
      expect(await page.locator('#dialogue').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(0, 0, 0)');
      await page.locator('#stage').screenshot({ path: 'test-results/prologue-desktop.png', animations: 'disabled' });
    }
    if (i === 5) await expect(page.locator('.typing-visible')).toContainText('先找她，再去长明印刷铺');
    await page.locator('[data-choice="0"]').focus();
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('#stage')).not.toHaveClass(/has-prologue/);
  await expect(page.locator('#scene-caption')).toContainText('槐生里');
  await expect(page.locator('[data-hotspot="aunt"]')).toBeVisible();
  const snapshot = await saved(page);
  expect(snapshot.dialogue).toBeNull();
  expect(snapshot.state.flags).toEqual(['intro']);
  expect(snapshot.state.inventory).toEqual(['letter']);
  expect(snapshot.state.log).toHaveLength(1);
  await page.reload();
  await page.locator('#title-screen [data-action="continue"]').click();
  await expect(page.locator('#stage')).not.toHaveClass(/has-prologue/);
  await expect(page.locator('#quest-hud')).toBeVisible();
});

test('language changes and reload resume the same prologue page, and skip only completes the opening', async ({ page }) => {
  await start(page);
  await reveal(page); await page.locator('[data-choice="0"]').click();
  await reveal(page); await page.locator('[data-choice="0"]').click();
  await page.locator('[data-action="prologue-language"]').click();
  await expect(page.locator('.prologue-heading')).toHaveText('A name on paper');
  await expect(page.locator('.typing-layout')).toContainText('After 1966');
  await page.reload();
  await page.locator('#title-screen [data-action="continue"]').click();
  await expect(page.locator('#dialogue')).toHaveClass(/prologue/);
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node', 'introPersecution');
  await page.locator('[data-action="skip-prologue"]').click();
  const snapshot = await saved(page);
  expect(snapshot.dialogue).toBeNull();
  expect(snapshot.state.flags).toEqual(['intro']);
  expect(snapshot.state.inventory).toEqual(['letter']);
  expect(snapshot.state.log).toHaveLength(1);
  await page.keyboard.press('Escape');
  await page.locator('.modal [data-action="background"]').click();
  await expect(page.locator('.modal')).toContainText('Cultural Revolution');
  await expect(page.locator('.modal')).toContainText('Shen Bo');
  expect((await saved(page)).state).toEqual(snapshot.state);
});

test('prologue text scrolls while continue and skip stay reachable on small screens in both languages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await reveal(page);
  await page.locator('#stage').screenshot({ path: 'test-results/prologue-mobile.png', animations: 'disabled' });
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (let i = 0; i < 2; i++) {
      await reveal(page);
      for (const selector of ['[data-choice="0"]', '[data-action="skip-prologue"]', '[data-action="prologue-language"]']) {
        const bounds = await page.locator(selector).boundingBox();
        expect(bounds!.y).toBeGreaterThanOrEqual(0);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      }
      await page.locator('.prologue-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('[data-action="prologue-language"]').click();
    }
  }
  await page.locator('[data-action="skip-prologue"]').click();
  await expect(page.locator('#scene-caption')).toBeVisible();
});

test('reduced motion presents complete prologue text without an entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await expect(page.locator('.choices')).toBeVisible();
  await expect(page.locator('.typing-visible')).toHaveText((await page.locator('.typing-layout').textContent())!);
  expect(await page.locator('.prologue-scroll').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.locator('[data-choice="0"]').click();
  await expect(page.locator('.prologue-heading')).toHaveText('归人');
  await expect(page.locator('.choices')).toBeVisible();
});
