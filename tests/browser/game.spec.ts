import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function choice(page: Page, index = 0) {
  await page.locator(`[data-choice="${index}"]`).click();
}
async function interact(page: Page, id: string) {
  await page.locator(`[data-hotspot="${id}"]`).click();
  await expect(page.locator(".dialogue-text")).toBeVisible();
}
async function travel(page: Page, id: string) {
  await page.locator(`.sidebar [data-scene="${id}"]`).click();
  await expect(page.locator(`.sidebar [data-scene="${id}"]`)).toHaveClass(
    /current/,
  );
}
async function readSave(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("wudu-save-v1")!));
}
async function begin(page: Page) {
  await page.goto("/");
  await choice(page);
}

test("standalone HTML runs entirely inline and reaches an ending without network", async ({ page }) => {
  const errors: string[] = [];
  const network: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
  // The managed cloud browser blocks file:// navigation. Render the authorized
  // file's contents in a blank document to verify its self-contained execution.
  await page.setContent(await readFile(resolve("play.html"), "utf8"));
  await expect(page.locator(".dialogue-text")).toContainText("上海，一九六八年");
  await choice(page);
  await travel(page, "press");
  await interact(page, "lin");
  await choice(page);
  await choice(page);
  await travel(page, "archive");
  await interact(page, "cabinet");
  await choice(page);
  await travel(page, "river");
  await interact(page, "finale");
  await choice(page, 3);
  await expect(page.locator("#modal-title")).toHaveText("无声");
  expect(errors).toEqual([]);
  expect(network).toEqual([]);
});
async function fullJourney(page: Page) {
  await begin(page);
  await interact(page, "aunt");
  await choice(page);
  await choice(page);
  await travel(page, "home");
  await interact(page, "desk");
  await choice(page);
  await travel(page, "press");
  await interact(page, "lin");
  await choice(page);
  await choice(page);
  await travel(page, "clinic");
  await interact(page, "doctor");
  await choice(page);
  await choice(page);
  await interact(page, "gu");
  await choice(page);
  await choice(page);
  await travel(page, "archive");
  await interact(page, "cabinet");
  await choice(page);
  await travel(page, "river");
  await interact(page, "finale");
}

test("complete mouse journey, all seven items, all four endings, return to the last choice", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fullJourney(page);
  const save = await readSave(page);
  expect(save.state.inventory).toHaveLength(7);
  expect(save.state.visited).toHaveLength(6);
  for (const [index, name] of [
    [0, "留名"],
    [1, "余灯"],
    [2, "渡雾"],
    [3, "无声"],
  ] as const) {
    await choice(page, index);
    await expect(page.locator("#modal-title")).toHaveText(name);
    await expect(page.locator(".ending-prose")).not.toBeEmpty();
    await page.locator('[data-action="return-choice"]').click();
  }
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("wudu-endings")!),
    ),
  ).toHaveLength(4);
  expect(errors).toEqual([]);
});

test("language, bag, journal, manual save, reload, reset and restore", async ({
  page,
}) => {
  await begin(page);
  await interact(page, "aunt");
  await choice(page, 1);
  await choice(page);
  await page.locator('[data-action="lang"]').first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.keyboard.press("i");
  await expect(page.locator("#modal-title")).toHaveText("Belongings");
  await page.locator('[data-select-item="key"]').click();
  await expect(page.locator(".item-detail")).toContainText("Blue paint");
  await page.keyboard.press("Escape");
  await page.keyboard.press("j");
  await expect(page.locator(".journal-entry.complete")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-action="save"]').click();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect((await readSave(page)).state.inventory).toContain("key");
  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-action="reset"]').click();
  await page.locator('[data-action="confirm-reset"]').click();
  expect((await readSave(page)).state.inventory).toEqual(["letter"]);
  await page.locator('[data-action="settings"]').click();
  await page.locator('[data-action="load"]').click();
  await page.locator('[data-action="confirm-load"]').click();
  expect((await readSave(page)).state.inventory).toContain("key");
  await expect(page.locator(".dialogue-text")).toHaveCount(0);
});

test("keyboard movement, proximity interaction, numeric choices and modal focus", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('[data-choice="0"]')).toBeVisible();
  await page.keyboard.press("1");
  await page.keyboard.down("a");
  // Wait for actual proximity rather than assuming a frame rate on CI machines.
  await expect.poll(async () => {
    await page.keyboard.press("e");
    return (await page.locator(".speaker-badge h2").allTextContents())[0];
  }, { timeout: 15_000, intervals: [100] }).toBe("周姨");
  await page.keyboard.up("a");
  await expect(page.locator(".speaker-badge h2")).toHaveText("周姨");
  await page.keyboard.press("1");
  await page.keyboard.press("Space");
  expect((await readSave(page)).state.inventory).toContain("key");
  await page.keyboard.press("m");
  await expect(page.locator("#modal-title")).toContainText("地图");
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".modal button").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".modal-close")).toBeFocused();
  await page.keyboard.press("Escape");
  await page.locator('.sidebar [data-scene="archive"]').click();
  await expect(page.locator("#toast")).toContainText("校样");
  expect((await readSave(page)).state.scene).toBe("lane");
});

test("mobile layout has no overflow and supports touch-sized story and inventory controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await choice(page);
  await interact(page, "aunt");
  await choice(page);
  await choice(page);
  await page.locator('[data-action="bag"]').click();
  await expect(page.locator("#modal-title")).toHaveText("随身之物");
  await page.locator('[data-select-item="key"]').click();
  await expect(page.locator(".item-detail h3")).toHaveText("黄铜钥匙");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("initial scene renders pixel artwork, no runtime errors or missing assets", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const failed: string[] = [];
  page.on("requestfailed", (r) => failed.push(r.url()));
  await page.goto("/");
  await expect(page.locator(".dialogue-text")).toContainText(
    "上海，一九六八年",
  );
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  const colors = await page
    .locator("#world")
    .evaluate((el: HTMLCanvasElement) => {
      const d = el.getContext("2d")!.getImageData(0, 0, 720, 400).data;
      const set = new Set();
      for (let i = 0; i < d.length; i += 64)
        set.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      return set.size;
    });
  expect(colors).toBeGreaterThan(100);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("corrupt save recovers safely and audio/reduced-motion controls work", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("wudu-save-v1", "{bad"));
  await page.goto("/");
  await expect(page.locator(".dialogue-text")).toContainText(
    "上海，一九六八年",
  );
  await page.locator('[data-action="settings"]').click();
  await page.locator('.modal [data-action="audio"]').click();
  await expect(page.locator('.modal [data-action="audio"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('.modal [data-action="motion"]').click();
  await expect(page.locator('.modal [data-action="motion"]')).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
