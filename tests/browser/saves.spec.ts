import { test, expect, type Page } from '@playwright/test';
import { encodeSave, newGame } from '../../src/engine';

const title = (page: Page, name: string) => page.locator(`#title-screen [data-action="${name}"]`);
async function menu(page: Page, name: string) {
  await page.locator('#game-menu').click();
  await page.locator(`.modal [data-action="${name}"]`).click();
}
async function raw(page: Page, key = 'wudu-save-v1') {
  return page.evaluate(key => localStorage.getItem(key), key);
}
async function advance(page: Page) {
  if (!await page.locator('.choices').isVisible()) await page.locator('[data-action="advance"]').click();
  await page.locator('[data-choice="0"]').click();
}

test('title is keyboard navigable, contains no game HUD, and does not create an autosave', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#game-title')).toHaveText('雾渡');
  await expect(title(page, 'continue')).toBeDisabled();
  await expect(title(page, 'new-story')).toBeFocused();
  for (const id of ['dialogue', 'game-menu', 'quest-hud']) await expect(page.locator(`#${id}`)).toBeHidden();
  await page.keyboard.press('m');
  await page.keyboard.press('i');
  expect(await raw(page)).toBeNull();
  await expect(page.locator('.modal')).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await expect(title(page, 'saves')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.save-slot')).toHaveCount(4);
  await expect(page.locator('.save-slot-actions button:disabled')).toHaveCount(4);
  await expect(page.locator('[data-action^="slot-save-"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(title(page, 'saves')).toBeFocused();
  await page.locator('#world').evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect(await raw(page)).toBeNull();
  await expect(page.locator('#world')).toHaveAttribute('data-art-ready', 'true');
  await title(page, 'new-story').focus();
  await page.locator('#stage').screenshot({ path: 'test-results/title-desktop.png' });
  await page.keyboard.press('Enter');
  await expect(page.locator('#title-screen')).toBeHidden();
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node', 'intro');
  expect(JSON.parse((await raw(page))!).dialogue).toBe('intro');
  expect(errors).toEqual([]);
});

test('three slots persist separately; overwrite and new-game confirmations keep manual saves safe', async ({ page }) => {
  await page.goto('/');
  await title(page, 'new-story').click();
  for (const slot of ['1', '2', '3']) {
    await menu(page, 'saves');
    await page.locator(`[data-action="slot-save-${slot}"]`).click();
    await expect(page.locator(`#toast`)).toContainText(`已保存至档位 ${slot}`);
    await expect(page.locator(`[data-slot="${slot}"]`)).toHaveClass(/occupied/);
    await page.keyboard.press('Escape');
    await advance(page);
  }
  const keys = ['wudu-manual-v1', 'wudu-manual-v1-2', 'wudu-manual-v1-3'];
  const snapshots = await Promise.all(keys.map(key => raw(page, key)));
  expect(snapshots.map(s => JSON.parse(s!).dialogue)).toEqual(['intro', 'introReturn', 'introPersecution']);
  await menu(page, 'saves');
  await page.locator('[data-action="slot-save-2"]').click();
  await expect(page.locator('#modal-title')).toHaveText('覆盖档位 2？');
  await page.locator('.modal [data-action="saves"]').click();
  expect(await raw(page, keys[1])).toBe(snapshots[1]);
  await page.locator('[data-action="slot-save-2"]').click();
  await page.locator('[data-action="confirm-save"]').click();
  expect(JSON.parse((await raw(page, keys[1]))!).dialogue).toBe('introBrother');
  expect(await raw(page, keys[0])).toBe(snapshots[0]);
  expect(await raw(page, keys[2])).toBe(snapshots[2]);
  await page.locator('.modal').screenshot({ path: 'test-results/save-slots.png' });
  await page.keyboard.press('Escape');
  await menu(page, 'title');
  const autosave = await raw(page);
  await title(page, 'new-story').click();
  await expect(page.locator('#modal-title')).toHaveText('开始新的故事？');
  await page.locator('.modal .secondary-button[data-action="close"]').click();
  expect(await raw(page)).toBe(autosave);
  await title(page, 'new-story').click();
  await page.locator('[data-action="confirm-reset"]').click();
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node', 'intro');
  expect(await raw(page, keys[2])).toBe(snapshots[2]);
  await menu(page, 'saves');
  await page.locator('[data-action="slot-load-3"]').click();
  await page.locator('[data-action="confirm-load"]').click();
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node', 'introPersecution');
  await page.reload();
  await expect(page.locator('#title-screen')).toBeVisible();
  await title(page, 'continue').click();
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node', 'introPersecution');
  await menu(page, 'title');
  await title(page, 'saves').click();
  await page.locator('[data-action="slot-load-1"]').click();
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node', 'intro');
});

test('existing auto and legacy manual saves survive visiting title, options, language changes and reload', async ({ page }) => {
  const state = newGame(); state.inventory.push('key'); state.flags.push('intro');
  const auto = encodeSave(state, 'auntDoor');
  const legacy = JSON.stringify({ state, dialogue: 'auntMemory', savedAt: '2025-01-01T00:00:00Z' });
  await page.addInitScript(({ auto, legacy }) => {
    if (!localStorage.getItem('wudu-save-v1')) {
      localStorage.setItem('wudu-save-v1', auto);
      localStorage.setItem('wudu-manual-v1', legacy);
    }
  }, { auto, legacy });
  await page.goto('/');
  await title(page, 'lang').click();
  await title(page, 'settings').click();
  await page.locator('.modal [data-action="motion"]').click();
  await page.keyboard.press('Escape');
  await page.reload();
  expect(await raw(page)).toBe(auto);
  expect(await raw(page, 'wudu-manual-v1')).toBe(legacy);
  await expect(title(page, 'continue')).toHaveText('Continue');
  await title(page, 'saves').click();
  await expect(page.locator('[data-slot="1"]')).toContainText('Slot 1');
  await page.locator('[data-action="slot-load-1"]').click();
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node', 'auntMemory');
  expect(JSON.parse((await raw(page))!).state.inventory).toContain('key');
  expect(await raw(page, 'wudu-manual-v1')).toBe(legacy);
});

test('unavailable browser storage reports failure while the live story remains playable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
  });
  await page.goto('/');
  await title(page, 'new-story').click();
  await expect(page.locator('#toast')).toContainText('自动保存不可用');
  await advance(page);
  await menu(page, 'saves');
  await page.locator('[data-action="slot-save-2"]').click();
  await expect(page.locator('#toast')).toContainText('存档失败');
  await expect(page.locator('[data-slot="2"]')).toContainText('— 空 —');
  await page.keyboard.press('Escape');
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node', 'introReturn');
  await menu(page, 'title');
  await expect(page.locator('#toast')).toContainText('暂未返回标题');
  await expect(page.locator('#title-screen')).toBeHidden();
  await page.keyboard.press('Escape');
  await advance(page);
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node', 'introPersecution');
});

test('title and save list remain usable on phone and short landscape screens in both languages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#world')).toHaveAttribute('data-art-ready', 'true');
  await page.screenshot({ path: 'test-results/title-mobile.png' });
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    for (let language = 0; language < 2; language++) {
      for (const action of ['new-story', 'saves', 'settings', 'lang']) {
        const b = await title(page, action).boundingBox();
        expect(b!.x).toBeGreaterThanOrEqual(0);
        expect(b!.y).toBeGreaterThanOrEqual(0);
        expect(b!.x + b!.width).toBeLessThanOrEqual(viewport.width);
        expect(b!.y + b!.height).toBeLessThanOrEqual(viewport.height);
      }
      await title(page, 'saves').click();
      await expect(page.locator('.save-slot')).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.keyboard.press('Escape');
      await title(page, 'lang').click();
    }
  }
});
