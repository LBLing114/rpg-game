import { test, expect, type Page } from '@playwright/test';
import { newGame } from '../../src/engine';
import { getSpawn } from '../../src/grid';
import { scenes } from '../../src/story';
import type { SceneId, State } from '../../src/types';

const flags: State['flags'] = ['intro','aunt','trusted','protected','remembered','copied','homeClue','typeClue','medicalClue','archiveClue','sharedPlan','farewellAunt','riverReady','courtyardClue','freightClue','tideClue'];
async function seed(page: Page, scene: SceneId, dialogue: string | null = null) {
  await page.addInitScript(snapshot => {
    if (!localStorage.getItem('wudu-save-v1')) localStorage.setItem('wudu-save-v1', JSON.stringify(snapshot));
    localStorage.setItem('wudu-text-speed','0');
  }, { contentVersion:2, state: { ...newGame(),scene,...getSpawn(scene),
    inventory:['letter','key','photo','proof','record','testimony','ticket'],flags,
    visited: scenes.map(s=>s.id) }, dialogue,savedAt:new Date().toISOString() });
  await page.goto('/');
  await page.locator('#title-screen [data-action="continue"]').click();
}
async function walkDialogue(page:Page, stop?:string) {
  for(let i=0;i<60;i++) {
    const text=page.locator('.dialogue-text');
    if(!await text.count())return;
    if(await page.locator('#dialogue').getAttribute('data-node')===stop)return;
    await page.locator('.choices [data-choice]').first().click();
  }
  throw new Error('Dialogue loop');
}
async function travel(page:Page,scene:SceneId) {
  await page.keyboard.press('m');
  await page.locator(`[data-scene="${scene}"]`).click();
  await expect(page.locator('#scene-caption')).toContainText(scenes.find(s=>s.id===scene)!.name.zh);
}

test('new urban maps render distinct layouts and all connected doors work at desktop and phone sizes', async ({page})=>{
  test.setTimeout(90_000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await seed(page,'courtyard');
  for(const scene of ['courtyard','warehouse','waiting'] as const) {
    if(scene!=='courtyard') {
      await page.locator(`[data-hotspot="${scene}"]`).click();
      await expect(page.locator('#scene-caption')).toContainText(scenes.find(s=>s.id===scene)!.name.zh,{timeout:15000});
    }
    await expect(page.locator('#world')).toHaveAttribute('data-art-ready','true');
    await page.locator('#stage').screenshot({path:`test-results/map-${scene}.png`,animations:'disabled'});
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-hotspot="river"]').click();
  await expect(page.locator('#scene-caption')).toContainText('黄浦江岸');
  await page.locator('[data-hotspot="waiting"]').click();
  await expect(page.locator('#scene-caption')).toContainText('夜航候船室');
  await page.locator('#stage').screenshot({path:'test-results/map-waiting-mobile.png',animations:'disabled'});
  await page.keyboard.press('m');
  expect(await page.locator('[data-scene]').count()).toBe(9);
  await expect(page.locator('[data-scene="river"]')).toHaveClass(/objective/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('an anonymous commitment survives reload and cannot unlock the signed ending', async ({page})=>{
  test.setTimeout(90_000);
  await seed(page,'river','finale');
  await page.locator('[data-choice="0"]').click();
  await walkDialogue(page);
  await travel(page,'warehouse');
  await expect(page.locator('[data-hotspot="seal"]')).toHaveClass(/objective/);
  await page.locator('[data-hotspot="seal"]').click();
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node','witness1_0',{timeout:15000});
  await walkDialogue(page,'witnessAttribution');
  await page.locator('[data-choice="1"]').click();
  await walkDialogue(page);
  await page.reload();await page.locator('#title-screen [data-action="continue"]').click();
  await expect(page.locator('#quest-hud')).toContainText('寄存人的答复');
  for(const [scene,event] of [['courtyard','relay'],['press','typecase']] as const) {
    await travel(page,scene);await page.locator(`[data-hotspot="${event}"]`).click();
    await expect(page.locator('.dialogue-text')).toBeVisible({timeout:15000});await walkDialogue(page);
  }
  await travel(page,'waiting');await page.locator('[data-hotspot="window"]').click();
  await expect(page.locator('#dialogue')).toHaveAttribute('data-node','witnessDecision',{timeout:15000});
  await expect(page.locator('[data-choice="0"]')).toHaveCount(0);
  await expect(page.locator('[data-choice="1"]')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.locator('#game-menu').click();await page.locator('.modal [data-action="lang"]').click();await page.keyboard.press('Escape');
  await expect(page.locator('.typing-layout')).toContainText('The clerk');
  await page.locator('[data-choice="1"]').click();await walkDialogue(page);
  await expect(page.locator('#modal-title')).toHaveText('The unsigned record');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
