import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  eventIsAdjacent,
  eventPoint,
  findPath,
  getSpawn,
  interactionPoint,
  isWalkable,
  TILE_SIZE,
  tileCenter,
  toTile,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type Point,
} from "../../src/grid";
import { scenes } from "../../src/story";
import type { SceneId } from "../../src/types";

test.setTimeout(120_000);

async function reveal(page: Page) {
  if (!(await page.locator(".choices").isVisible())) {
    await page.locator('[data-action="advance"]').click();
  }
  await expect(page.locator(".choices")).toBeVisible();
}
async function choice(page: Page, index = 0) {
  await reveal(page);
  await page.locator(`[data-choice="${index}"]`).click();
}
// Follow the actual authored links, checking the DOM after each user choice.
async function conversation(page: Page, stopAt: string[] = ["finale"]) {
  for (let i = 0; i < 100; i++) {
    if (!(await page.locator(".dialogue-text").count())) return;
    const node = await page.locator("#dialogue").getAttribute("data-node");
    if (node && stopAt.includes(node)) return;
    await choice(page);
  }
  throw new Error("Dialogue did not reach its intended exit");
}
async function interact(page: Page, id: string) {
  await page.locator(`[data-hotspot="${id}"]`).click();
  await expect(page.locator(".dialogue-text")).toBeVisible({ timeout: 15_000 });
}
async function travel(page: Page, id: SceneId) {
  await page.keyboard.press("m");
  await page.locator(`.modal [data-scene="${id}"]`).click();
  await expect(page.locator(".modal")).toHaveCount(0);
  const scene = scenes.find((s) => s.id === id)!;
  await expect(page.locator("#scene-caption")).toContainText(
    new RegExp(`${scene.name.zh}|${scene.name.en}`),
  );
}
async function readSave(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("wudu-save-v1")!));
}
async function position(page: Page): Promise<Point> {
  return page.locator("#world").evaluate((canvas: HTMLCanvasElement) => ({
    x: Number(canvas.dataset.playerX),
    y: Number(canvas.dataset.playerY),
  }));
}
async function clickGround(page: Page, point: Point) {
  const bounds = await page.locator("#world").boundingBox();
  if (!bounds) throw new Error("The game canvas is not visible");
  await page.mouse.click(
    bounds.x + point.x / WORLD_WIDTH * bounds.width,
    bounds.y + point.y / WORLD_HEIGHT * bounds.height,
  );
}
async function menuAction(page: Page, action: string) {
  await page.locator('#game-menu').click();
  await page.locator(`.modal [data-action="${action}"]`).click();
}
async function begin(page: Page) {
  await page.goto("/");
  await page.locator('#title-screen [data-action="new-story"]').click();
  await conversation(page);
}

async function fullJourney(page: Page, navigate = true) {
  if (navigate) await begin(page);
  else await conversation(page);
  await interact(page, "aunt");
  await conversation(page);
  await travel(page, "home");
  await interact(page, "desk");
  await conversation(page);
  await travel(page, "press");
  await interact(page, "typecase");
  await conversation(page);
  await interact(page, "lin");
  await conversation(page);
  await travel(page, "clinic");
  await interact(page, "register");
  await conversation(page);
  await interact(page, "doctor");
  await conversation(page);
  await interact(page, "gu");
  await conversation(page);
  await travel(page, "archive");
  await interact(page, "ledger");
  await conversation(page);
  await interact(page, "cabinet");
  await conversation(page);
  await travel(page, "press");
  await interact(page, "lin");
  await conversation(page);
  await travel(page, "lane");
  await interact(page, "aunt");
  await conversation(page);
  await travel(page, "river");
  await interact(page, "finale");
  await conversation(page);
}

test("standalone HTML runs entirely inline and reaches an ending without network", async ({ page }) => {
  const errors: string[] = [];
  const network: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => { if (/^https?:/.test(r.url())) network.push(r.url()); });
  // The managed cloud browser blocks file:// navigation. Execute the authorized
  // standalone file in a blank document, with no server or external assets.
  await page.setContent(await readFile(resolve("play.html"), "utf8"));
  await page.locator('#title-screen [data-action="new-story"]').click();
  await expect(page.locator('#world')).toHaveAttribute('data-art-ready', 'true');
  await expect(page.locator('#dialogue')).toHaveClass(/prologue/);
  await expect(page.locator('.portrait')).toHaveCount(0);
  await expect(page.locator(".typing-layout")).toContainText("上海，一九六八年");
  await fullJourney(page, false);
  await choice(page, 3);
  await expect(page.locator("#modal-title")).toHaveText("无声");
  expect(errors).toEqual([]);
  expect(network).toEqual([]);
});

test("typewriter reveals progressively and Enter/Space reveal before advancing", async ({ page }) => {
  await page.goto("/");
  await page.locator('#title-screen [data-action="new-story"]').click();
  const text = page.locator(".typing-visible");
  const completeText = await page.locator(".typing-layout").textContent();
  const initialLength = (await text.textContent())!.length;
  expect(initialLength).toBeLessThan(completeText!.length);
  await expect(page.locator(".choices")).toBeHidden();
  await expect.poll(async () => (await text.textContent())!.length).toBeGreaterThan(initialLength);
  await page.keyboard.press("Enter");
  await expect(text).toHaveText(completeText!);
  await expect(page.locator(".choices")).toBeVisible();
  expect((await readSave(page)).dialogue).toBe("intro");
  await page.keyboard.press("Space");
  await expect(page.locator("#dialogue")).toHaveAttribute("data-node", "introReturn");
  await conversation(page);
  await expect(page.locator(".dialogue-text")).toHaveCount(0);
  expect((await readSave(page)).state.flags).toContain("intro");
  await interact(page, "aunt");
  await page.keyboard.press("Space");
  await expect(page.locator(".choices")).toBeVisible();
  expect((await readSave(page)).dialogue).toBe("aunt");
  await page.keyboard.press("1");
  expect((await readSave(page)).dialogue).toBe("auntKey");
  await page.keyboard.press("Enter");
  await expect(page.locator(".choices")).toBeVisible();
  await page.keyboard.press("Enter");
  await conversation(page);
  await expect(page.locator(".dialogue-text")).toHaveCount(0);
});

test("complete mouse journey, all seven items, all four endings, return to the last choice", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fullJourney(page);
  const save = await readSave(page);
  expect(save.state.inventory).toHaveLength(7);
  expect(save.state.visited).toHaveLength(6);
  expect(eventIsAdjacent("river", "finale", save.state)).toBe(true);
  for (const [index, name] of [[0, "留名"], [1, "余灯"], [2, "渡雾"], [3, "无声"]] as const) {
    await choice(page, index);
    await expect(page.locator("#modal-title")).toHaveText(name);
    await expect(page.locator(".ending-prose")).not.toBeEmpty();
    await page.locator('[data-action="return-choice"]').click();
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wudu-endings")!))).toHaveLength(4);
  expect(errors).toEqual([]);
});

test("language, bag, journal, manual save, reload, reset and restore", async ({ page }) => {
  await begin(page);
  await interact(page, "aunt");
  await choice(page, 1);
  await conversation(page);
  await menuAction(page, "lang");
  await page.keyboard.press("Escape");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.keyboard.press("i");
  await expect(page.locator("#modal-title")).toHaveText("Belongings");
  await page.locator('[data-select-item="key"]').click();
  await expect(page.locator(".item-detail")).toContainText("Blue paint");
  await page.keyboard.press("Escape");
  await page.keyboard.press("j");
  await expect(page.locator(".journal-entry.complete")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await menuAction(page, "settings");
  await page.locator('.modal [data-action="saves"]').click();
  await page.locator('[data-action="slot-save-1"]').click();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.locator('#title-screen [data-action="continue"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect((await readSave(page)).state.inventory).toContain("key");
  await menuAction(page, "settings");
  await page.locator('[data-action="reset"]').click();
  await page.locator('[data-action="confirm-reset"]').click();
  expect((await readSave(page)).state.inventory).toEqual(["letter"]);
  await menuAction(page, "settings");
  await page.locator('.modal [data-action="saves"]').click();
  await page.locator('[data-action="slot-load-1"]').click();
  await page.locator('[data-action="confirm-load"]').click();
  expect((await readSave(page)).state.inventory).toContain("key");
  await expect(page.locator(".dialogue-text")).toHaveCount(0);
});

test("inventory use approaches the intended NPC and unlocks the photograph branch", async ({ page }) => {
  await begin(page);
  await interact(page, "aunt");
  await conversation(page);
  await travel(page, "home");
  await interact(page, "desk");
  await conversation(page);
  await travel(page, "press");
  await interact(page, "typecase");
  await conversation(page);
  await interact(page, "lin");
  await conversation(page);
  await travel(page, "clinic");
  await page.keyboard.press("i");
  await page.locator('[data-select-item="photo"]').click();
  await page.locator('[data-action="use-item"]').click();
  await expect(page.locator(".modal")).toHaveCount(0);
  await expect(page.locator(".speaker-badge h2")).toHaveText("顾文山", { timeout: 15_000 });
  const save = await readSave(page);
  expect(eventIsAdjacent("clinic", "gu", save.state)).toBe(true);
  expect(save.dialogue).toBe("gu");
  await conversation(page);
  expect((await readSave(page)).state.flags).toContain("remembered");
});

test("keyboard follows grid tiles, bumps NPC collision, interacts with Enter and traps modal focus", async ({ page }) => {
  await begin(page);
  let previous = getSpawn("lane");
  expect(await position(page)).toEqual(previous);
  const destination = interactionPoint("lane", "aunt", previous);
  const route = findPath("lane", previous, destination);
  expect(route.length).toBeGreaterThan(0);
  for (const next of route) {
    const key = next.x > previous.x ? "ArrowRight" : next.x < previous.x ? "ArrowLeft" : next.y > previous.y ? "ArrowDown" : "ArrowUp";
    await page.keyboard.press(key, { delay: 50 });
    await expect.poll(() => position(page)).toEqual(next);
    previous = next;
  }
  const aunt = eventPoint("lane", "aunt");
  const faceKey = aunt.x > previous.x ? "ArrowRight" : aunt.x < previous.x ? "ArrowLeft" : aunt.y > previous.y ? "ArrowDown" : "ArrowUp";
  await page.keyboard.press(faceKey, { delay: 50 });
  expect(await position(page)).toEqual(destination);
  await page.keyboard.press("Enter");
  await expect(page.locator(".speaker-badge h2")).toHaveText("周姨");
  const save = await readSave(page);
  expect({ x: save.state.x, y: save.state.y }).toEqual(destination);
  expect(eventIsAdjacent("lane", "aunt", save.state)).toBe(true);
  await reveal(page);
  await page.keyboard.press("1");
  await reveal(page);
  await page.keyboard.press("Space");
  expect((await readSave(page)).state.inventory).toContain("key");
  await conversation(page);
  await page.keyboard.press("m");
  await expect(page.locator("#modal-title")).toContainText("地图");
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".modal button").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".modal-close")).toBeFocused();
  await page.locator('.modal [data-scene="archive"]').click();
  await expect(page.locator("#toast")).toContainText("校样");
  expect((await readSave(page)).state.scene).toBe("lane");
});

test("mouse pathfinding traverses adjacent walkable tiles around furniture", async ({ page }) => {
  await begin(page);
  await interact(page, "aunt");
  await conversation(page);
  await travel(page, "home");
  const destination = tileCenter(4, 6);
  await page.locator("#world").evaluate((canvas: HTMLCanvasElement) => {
    const points: Point[] = [];
    (window as unknown as { walkedTiles: Point[] }).walkedTiles = points;
    const remember = () => {
      const point = { x: Number(canvas.dataset.playerX), y: Number(canvas.dataset.playerY) };
      const previous = points.at(-1);
      if (!previous || point.x !== previous.x || point.y !== previous.y) points.push(point);
    };
    remember();
    new MutationObserver(remember).observe(canvas, { attributes: true, attributeFilter: ["data-player-x", "data-player-y"] });
  });
  await clickGround(page, destination);
  await expect.poll(() => position(page), { timeout: 15_000 }).toEqual(destination);
  const walked = await page.evaluate(() => (window as unknown as { walkedTiles: Point[] }).walkedTiles);
  expect(walked.length).toBeGreaterThan(4);
  for (const [i, point] of walked.entries()) {
    const tile = toTile(point);
    expect(isWalkable("home", tile.col, tile.row), JSON.stringify(point)).toBe(true);
    expect(point.x % TILE_SIZE).toBe(TILE_SIZE / 2);
    expect(point.y % TILE_SIZE).toBe(TILE_SIZE / 2);
    if (i) expect(Math.abs(point.x - walked[i - 1].x) + Math.abs(point.y - walked[i - 1].y)).toBe(TILE_SIZE);
  }
  await page.reload();
  await page.locator('#title-screen [data-action="continue"]').click();
  expect(await position(page)).toEqual(destination);
});

test("mobile dialogue stays inside the stage and supports story and inventory controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator('#title-screen [data-action="new-story"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await reveal(page);
  const stage = await page.locator("#stage").boundingBox();
  const dialogue = await page.locator("#dialogue").boundingBox();
  expect(stage).not.toBeNull();
  expect(dialogue).not.toBeNull();
  expect(dialogue!.x).toBeGreaterThanOrEqual(stage!.x);
  expect(dialogue!.x + dialogue!.width).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
  expect(dialogue!.y + dialogue!.height).toBeLessThanOrEqual(stage!.y + stage!.height + 1);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await conversation(page);
  await interact(page, "aunt");
  await conversation(page);
  await menuAction(page, "bag");
  await expect(page.locator("#modal-title")).toHaveText("随身之物");
  await page.locator('[data-select-item="key"]').click();
  await expect(page.locator(".item-detail h3")).toHaveText("黄铜钥匙");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("initial RPG stage renders pixel artwork, portraits, no runtime errors or missing assets", async ({ page }) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => failed.push(r.url()));
  await page.goto("/");
  await page.locator('#title-screen [data-action="new-story"]').click();
  await expect(page.locator("#stage #dialogue")).toBeVisible();
  await expect(page.locator("header, footer, .scene-toolbar, .chapter-heading, .scene-frame, .control-strip")).toHaveCount(0);
  await expect(page.locator("#stage #game-menu")).toBeVisible();
  const bounds = await page.locator("#stage").boundingBox();
  expect(bounds!.width).toBe(1440);
  expect(bounds!.height).toBe(960);
  await expect(page.locator(".typing-layout")).toContainText("上海，一九六八年");
  await expect(page.locator("#world")).toHaveAttribute("width", String(WORLD_WIDTH));
  await expect(page.locator("#world")).toHaveAttribute("height", String(WORLD_HEIGHT));
  await expect(page.locator("#dialogue")).toHaveClass(/prologue/);
  await conversation(page);
  await interact(page, "aunt");
  await expect(page.locator(".dialogue-face canvas.portrait")).toHaveAttribute("width", "192");
  await expect(page.locator(".dialogue-face canvas.portrait")).toHaveAttribute("height", "320");
  await expect(page.locator('#world')).toHaveAttribute('data-art-ready', 'true');
  await reveal(page);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  const colors = await page.locator("#world").evaluate((el: HTMLCanvasElement) => {
    const data = el.getContext("2d")!.getImageData(0, 0, el.width, el.height).data;
    const colors = new Set();
    for (let i = 0; i < data.length; i += 64) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return colors.size;
  });
  expect(colors).toBeGreaterThan(100);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("corrupt save recovers safely and audio/reduced-motion controls work", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("wudu-save-v1", "{bad"));
  await page.goto("/");
  await page.locator('#title-screen [data-action="new-story"]').click();
  await expect(page.locator(".typing-layout")).toContainText("上海，一九六八年");
  await menuAction(page, "settings");
  await page.locator('.modal [data-action="audio"]').click();
  await expect(page.locator('.modal [data-action="audio"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('.modal [data-action="motion"]').click();
  await expect(page.locator('.modal [data-action="motion"]')).toHaveAttribute("aria-pressed", "false");
});

test("keyboard in-game menu controls work during dialogue and text/sound preferences apply", async ({ page }) => {
  await page.goto("/");
  await page.locator('#title-screen [data-action="new-story"]').click();
  await page.locator('#game-menu').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#modal-title")).toHaveText("雾渡");
  await page.locator('[data-action="lang"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.locator('[data-action="settings"]').focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".modal")).toBeVisible();
  await page.locator('[data-action="effects"]').click();
  await expect(page.locator('[data-action="effects"]')).toHaveAttribute("aria-pressed", "false");
  await page.locator('[data-action="text-speed"]').click();
  await expect(page.locator('[data-action="text-speed"]')).toHaveText("Fast");
  await page.locator('[data-action="text-speed"]').click();
  await expect(page.locator('[data-action="text-speed"]')).toHaveText("Instant");
  await page.keyboard.press("Escape");
  await expect(page.locator(".choices")).toBeVisible();
  await expect(page.locator("#game-menu")).toBeFocused();
  await page.locator("#dialogue .dialogue-text").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#dialogue")).toHaveAttribute("data-node", "introReturn");
  expect(await page.evaluate(() => localStorage.getItem("wudu-text-speed"))).toBe("0");
  expect(await page.evaluate(() => localStorage.getItem("wudu-effects"))).toBe("off");
});


test("deduction mistakes remain retryable, opening context is bilingual, and background reading preserves progress", async ({ page }) => {
  await page.goto("/");
  await page.locator('#title-screen [data-action="new-story"]').click();
  await choice(page);
  await choice(page);
  await expect(page.locator("#dialogue")).toHaveAttribute("data-node", "introPersecution");
  await page.reload();
  await page.locator('#title-screen [data-action="continue"]').click();
  await expect(page.locator("#dialogue")).toHaveAttribute("data-node", "introPersecution");
  const saved = await readSave(page);
  await menuAction(page, "background");
  await expect(page.locator(".modal")).toContainText("文化大革命");
  await expect(page.locator(".modal")).toContainText("法国里昂");
  await page.keyboard.press("Escape");
  expect((await readSave(page)).dialogue).toBe(saved.dialogue);
  await menuAction(page, "lang");
  await page.keyboard.press("Escape");
  await menuAction(page, "background");
  await expect(page.locator(".modal")).toContainText("Cultural Revolution");
  await page.keyboard.press("Escape");
  await conversation(page);
  await interact(page, "aunt"); await conversation(page);
  await travel(page, "home"); await interact(page, "desk"); await conversation(page);
  await travel(page, "press"); await interact(page, "typecase"); await conversation(page);
  await interact(page, "lin"); await conversation(page, ["proofQuestion"]);
  await choice(page, 1);
  await expect(page.locator("#dialogue")).toHaveAttribute("data-node", "proofMistake");
  expect((await readSave(page)).state.inventory).not.toContain("proof");
  await page.reload();
  await page.locator('#title-screen [data-action="continue"]').click();
  await expect(page.locator("#dialogue")).toHaveAttribute("data-node", "proofMistake");
  await choice(page);
  await expect(page.locator("#dialogue")).toHaveAttribute("data-node", "proofQuestion");
  await conversation(page);
  expect((await readSave(page)).state.inventory).toContain("proof");
});
