import { test, expect, type Page } from '@playwright/test';
import { getSpawn, tileCenter } from '../../src/grid';
import { scenes } from '../../src/story';
import type { SceneId, State } from '../../src/types';

const inventory: State['inventory'] = ['letter', 'key', 'photo', 'proof', 'record', 'testimony', 'ticket'];
async function seed(page: Page, scene: SceneId = 'lane', dialogue: string | null = null) {
  await page.addInitScript(snapshot => {
    // Seed once so a reload still exercises the game's actual autosave.
    if (!localStorage.getItem('wudu-save-v1')) localStorage.setItem('wudu-save-v1', JSON.stringify(snapshot));
  }, { contentVersion: 2, state: {
    version: 1, scene, inventory, flags: ['intro'],
    visited: ['lane', 'home', 'press', 'clinic', 'archive', 'river'],
    log: [], ending: null, ...getSpawn(scene),
  }, dialogue, savedAt: new Date().toISOString() });
  await page.goto('/');
  await page.locator('#title-screen [data-action="continue"]').click();
  await expect(page.locator('#world')).toHaveAttribute('data-art-ready', 'true');
}
async function position(page: Page) {
  return page.locator('#world').evaluate((canvas: HTMLCanvasElement) => ({
    x: Number(canvas.dataset.playerX), y: Number(canvas.dataset.playerY),
  }));
}
async function reveal(page: Page) {
  if (!(await page.locator('.choices').isVisible())) await page.locator('[data-action="advance"]').click();
  await expect(page.locator('.choices')).toBeVisible();
}

test('all five exits return to their matching street door, persist on reload, and allow re-entry', async ({ page }) => {
  test.setTimeout(90_000);
  await seed(page);
  for (const [room, col, row] of [
    ['home', 3, 6], ['press', 12, 6], ['clinic', 20, 6], ['archive', 3, 12], ['river', 21, 13],
  ] as const) {
    await page.locator(`[data-hotspot="${room}"]`).click();
    await expect(page.locator('#scene-caption')).toContainText(scenes.find(s => s.id === room)!.name.zh, { timeout: 15_000 });
    expect(await position(page)).toEqual(room === 'river' ? tileCenter(3, 13) : tileCenter(11, 13));
    await page.locator('[data-hotspot="lane"]').click();
    await expect(page.locator('#scene-caption')).toContainText('槐生里');
    expect(await position(page)).toEqual(tileCenter(col, row));
    await expect(page.locator('#world')).toHaveAttribute('data-facing', room === 'river' ? 'left' : 'down');
    // Standing at the entrance does not automatically send the player back inside.
    await page.reload();
    await page.locator('#title-screen [data-action="continue"]').click();
    await expect(page.locator('#scene-caption')).toContainText('槐生里');
    expect(await position(page)).toEqual(tileCenter(col, row));
    if (room === 'home') {
      await page.locator('#world').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#scene-caption')).toContainText('沈家旧屋');
      await page.locator('[data-hotspot="lane"]').click();
      await expect(page.locator('#scene-caption')).toContainText('槐生里');
    }
  }
  await page.keyboard.press('ArrowDown', { delay: 50 });
  await expect.poll(() => position(page)).toEqual(tileCenter(21, 14));
  await page.keyboard.press('m');
  await page.locator('.modal [data-scene="lane"]').click();
  await expect(page.locator('.modal')).toHaveCount(0);
  expect(await position(page)).toEqual(tileCenter(21, 14));
});

test('revisiting the desk shows its caption instead of a ship, then restores Shen’s bust for his recollection', async ({ page }) => {
  await seed(page, 'home');
  await page.locator('[data-hotspot="desk"]').click();
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node', 'deskAgain', { timeout: 15_000 });
  await expect(page.locator('.narration-title')).toHaveText('旧书桌');
  await expect(page.locator('#dialogue canvas, .dialogue-face')).toHaveCount(0);
  await reveal(page);
  await page.locator('#stage').screenshot({ path: 'test-results/desk-caption.png' });
  await page.locator('[data-choice="0"]').click();
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node', 'deskInventory');
  await expect(page.locator('.portrait')).toHaveAttribute('data-illustration', 'shen');
  await expect(page.locator('.narration-title')).toHaveCount(0);
});

for (const [scene, node, title] of [
  ['lane', 'wall', '斑驳的墙'], ['archive', 'cabinetAgain', '转运名册'],
  ['archive', 'archiveWall', '停摆的钟'], ['river', 'water', '黄浦江'],
] as const) {
  test(`environmental caption ${node} stays text-only on desktop, mobile, and after language switching`, async ({ page }) => {
    await seed(page, scene, node);
    await expect(page.locator('.narration-title')).toHaveText(title);
    await expect(page.locator('#dialogue canvas, .dialogue-face')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#game-menu').click();
    await page.locator('.modal [data-action="lang"]').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#dialogue canvas, .dialogue-face')).toHaveCount(0);
    const body = await page.locator('.dialogue-body').boundingBox();
    expect(body!.width).toBeGreaterThan(350);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
