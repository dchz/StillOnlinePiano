import { expect, test } from "@playwright/test";
import {
  beat,
  progress,
  ready,
  roll,
  start,
  aligned,
} from "./practice-helpers";

test("bars descend past the hit line without waiting for input and stay aligned with their keys", async ({
  page,
}) => {
  await ready(page);
  await aligned(page, 0, 76);
  await aligned(page, 1, 75);
  const bar = page.locator('[data-roll-index="0"]');
  const relativeY = async () =>
    (await bar.boundingBox())!.y - (await roll(page).boundingBox())!.y;
  const initial = await relativeY();
  await start(page);
  await page.clock.runFor(400);
  expect(await relativeY()).toBeGreaterThan(initial);
  await page.clock.runFor(1270);
  const a = (await bar.boundingBox())!;
  const b = (await page.locator('[data-note="76"]').boundingBox())!;
  expect(Math.abs(a.y + a.height - b.y)).toBeLessThan(3);
  await page.clock.runFor(800);
  expect(await beat(page)).toBeGreaterThan(0.9);
  await expect(roll(page)).toHaveAttribute("data-motion", "moving");
  await aligned(page, 4, 76);
});

test("long notes retain their lengths and automatic octave changes keep physical lanes fixed", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: /짐노페디 1번/ }).click();
  const height = async (index: number) =>
    (await page.locator(`[data-roll-index="${index}"]`).boundingBox())!.height;
  expect((await height(8)) / (await height(0))).toBeCloseTo(3);
  expect((await height(9)) / (await height(0))).toBeCloseTo(12);
  const x = (await page.locator('[data-note="60"]').boundingBox())!.x;
  await start(page);
  await page.clock.runFor(6000); // F#5 through B4, crossing the computer-keyboard octave.
  await expect(
    page.locator('.piano-key[data-expected="true"]'),
  ).toHaveAttribute("data-note", "71");
  expect((await page.locator('[data-note="60"]').boundingBox())!.x).toBeCloseTo(
    x,
  );
  await page.setViewportSize({ width: 900, height: 900 });
  await aligned(page, 5, 71);
});

test("reduced motion uses static steps while the music and progress continue automatically", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await start(page);
  const transform = () =>
    page
      .locator(".roll-note-layer")
      .evaluate((el) => getComputedStyle(el).transform);
  const initial = await transform();
  await page.clock.runFor(1000);
  expect(await transform()).toBe(initial);
  await page.clock.runFor(700);
  expect(await transform()).not.toBe(initial);
  await expect(page.locator('[data-note="76"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.clock.runFor(250);
  await expect(progress(page)).toHaveAttribute("value", "1");
});

test("desktop automatic-playback visual reference", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await ready(page);
  await start(page);
  await page.clock.runFor(1700);
  await page
    .locator(".piano-studio")
    .screenshot({ path: "/tmp/still-piano-autoplay-desktop.png" });
});

test.describe("mobile waterfall", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("touch input and horizontal scrolling do not interrupt automatic music", async ({
    page,
  }) => {
    await ready(page);
    await start(page);
    await page.clock.runFor(1700);
    await aligned(page, 0, 76);
    await aligned(page, 1, 75);
    await page.locator(".keyboard-viewport").evaluate((el) => {
      el.scrollLeft = 90;
    });
    await aligned(page, 0, 76);
    const hint = (await page.locator(".roll-status").boundingBox())!;
    const viewport = (await page.locator(".keyboard-viewport").boundingBox())!;
    expect(hint.x).toBeGreaterThanOrEqual(viewport.x);
    expect(hint.x + hint.width).toBeLessThanOrEqual(
      viewport.x + viewport.width,
    );
    await page.locator('[data-note="76"]').tap();
    await expect(page.locator('[data-note="76"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.clock.runFor(250);
    await expect(progress(page)).toHaveAttribute("value", "1");
    await expect(page.locator('[data-note="75"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await page.screenshot({ path: "/tmp/still-piano-autoplay-mobile.png" });
  });
});
