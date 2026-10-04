import { expect, test, type Page } from "@playwright/test";
import { lessonNotes, SONGS } from "../src/songs";

const roll = (page: Page) => page.locator(".falling-notes");
const playhead = (page: Page) => roll(page).getAttribute("data-playhead");
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByText("연주할 준비가 되었어요")).toBeVisible();
  await page.getByRole("button", { name: "곡 연습", exact: false }).click();
  await expect(roll(page)).toBeVisible();
  await page.clock.install({ time: new Date("2026-10-04T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-04T00:00:01Z"));
}
async function aligned(page: Page, index: number, note: number) {
  const bar = await page.locator(`[data-roll-index="${index}"]`).boundingBox();
  const key = await page.locator(`[data-note="${note}"]`).boundingBox();
  expect(bar).not.toBeNull();
  expect(key).not.toBeNull();
  expect(
    Math.abs(bar!.x + bar!.width / 2 - (key!.x + key!.width / 2)),
  ).toBeLessThan(1.1);
}
async function pressExpected(page: Page) {
  const key = page.locator('.piano-key[data-expected="true"] .key-label');
  const progress = page.getByRole("progressbar", { name: "연습 진행" });
  const before = await progress.getAttribute("value");
  await expect(key).not.toHaveText("");
  await page.keyboard.press((await key.innerText()).toLowerCase());
  await expect(progress).not.toHaveAttribute("value", before!);
}
async function startPractice(page: Page) {
  await page.getByRole("button", { name: "연습 시작", exact: true }).click();
  // AudioContext.resume() uses the browser's real clock, independent of the
  // paused animation clock. Wait for the async start before advancing frames.
  await expect(
    page.getByRole("button", { name: "일시정지", exact: true }),
  ).toBeVisible();
  await expect(roll(page)).toHaveAttribute("data-motion", "practicing");
}

test("notes descend into their keys, wait for a correct note, and freeze on pause", async ({
  page,
}) => {
  await ready(page);
  await aligned(page, 0, 76);
  await aligned(page, 1, 75);
  const bar = page.locator('[data-roll-index="0"]');
  const relativeY = async () =>
    (await bar.boundingBox())!.y - (await roll(page).boundingBox())!.y;
  const initialY = await relativeY();
  await startPractice(page);
  await page.clock.runFor(400);
  expect(await relativeY()).toBeGreaterThan(initialY);
  await page.clock.runFor(1600);
  await expect(roll(page)).toHaveAttribute("data-motion", "waiting");
  expect(Number(await playhead(page))).toBeCloseTo(0);
  const barAtLine = (await bar.boundingBox())!;
  const key = (await page.locator('[data-note="76"]').boundingBox())!;
  expect(Math.abs(barAtLine.y + barAtLine.height - key.y)).toBeLessThan(2);
  await page.clock.runFor(4000);
  await page.keyboard.press("a");
  expect(Number(await playhead(page))).toBeCloseTo(0);
  await pressExpected(page);
  await page.clock.runFor(250);
  expect(Number(await playhead(page))).toBeCloseTo(0.25);
  await aligned(page, 1, 75);
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  const paused = await playhead(page);
  await page.clock.runFor(5000);
  expect(await playhead(page)).toBe(paused);
  await expect(roll(page)).toHaveAttribute("data-motion", "paused");
  await page.getByRole("button", { name: "이어서 연습", exact: true }).click();
  await pressExpected(page);
  await page.clock.runFor(250);
  expect(Number(await playhead(page))).toBeCloseTo(0.5);
  await page.getByRole("button", { name: "처음부터", exact: true }).click();
  expect(Number(await playhead(page))).toBe(-2);
});

test("preview audio starts as its bar hits the line and stopping restores practice position", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("연습 구간").selectOption("0");
  await startPractice(page);
  await page.clock.runFor(2000);
  await pressExpected(page);
  await page.clock.runFor(100);
  const practicePosition = await playhead(page);
  expect(Number(practicePosition)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "선율 미리 듣기" }).click();
  await expect(page.getByRole("button", { name: "듣기 멈추기" })).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
  expect(Number(await playhead(page))).toBeCloseTo(-0.8, 1);
  await page.clock.runFor(700);
  await expect(page.locator('[data-note="76"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(Math.abs(Number(await playhead(page)))).toBeLessThan(0.06);
  await expect(
    page.getByRole("progressbar", { name: "연습 진행" }),
  ).toHaveAttribute("value", "1");
  await page.getByRole("button", { name: "듣기 멈추기" }).click();
  await page.clock.runFor(5000);
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
  expect(await playhead(page)).toBe(practicePosition);
});

test("long notes keep proportional lengths and octave changes do not move the lanes", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: /짐노페디 1번/ }).click();
  const height = async (index: number) =>
    (await page.locator(`[data-roll-index="${index}"]`).boundingBox())!.height;
  expect((await height(8)) / (await height(0))).toBeCloseTo(3);
  expect((await height(9)) / (await height(0))).toBeCloseTo(12);
  const keyboardX = (await page.locator('[data-note="60"]').boundingBox())!.x;
  await startPractice(page);
  for (let i = 0; i < 6; i++) {
    await aligned(page, i, lessonNotes(SONGS[1], null)[i].midi);
    await pressExpected(page);
  }
  expect((await page.locator('[data-note="60"]').boundingBox())!.x).toBeCloseTo(
    keyboardX,
  );
  await page.setViewportSize({ width: 900, height: 900 });
  await aligned(page, 6, 73);
});

test("half speed slows the visual clock and replay resets the runway", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("진행 속도").selectOption("0.5");
  await page.getByLabel("연습 구간").selectOption("0");
  await page.getByRole("button", { name: "선택 구간 반복" }).click();
  await startPractice(page);
  await page.clock.runFor(1000);
  expect(Number(await playhead(page))).toBeCloseTo(-1.4, 1);
  for (const _note of SONGS[0].sections[0].notes) await pressExpected(page);
  await expect(page.getByText("1회 완주", { exact: true })).toBeVisible();
  expect(Number(await playhead(page))).toBeLessThan(-1.9);
  await page.getByLabel("연습 구간").selectOption("1");
  await expect(roll(page)).toHaveAttribute("data-motion", "ready");
  expect(Number(await playhead(page))).toBe(-2);
});

test("reduced motion presents static upcoming notes and steps on correct input", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await startPractice(page);
  await page.clock.runFor(50);
  expect(Number(await playhead(page))).toBe(0);
  await page.clock.runFor(4000);
  expect(Number(await playhead(page))).toBe(0);
  await pressExpected(page);
  await page.clock.runFor(50);
  expect(Number(await playhead(page))).toBe(0.25);
});

test("desktop waterfall visual reference", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await ready(page);
  await startPractice(page);
  await page.clock.runFor(2000);
  await page
    .locator(".piano-studio")
    .screenshot({ path: "/tmp/still-piano-falling-notes.png" });
});

test.describe("mobile waterfall", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("shares horizontal scrolling with the keyboard and supports touch", async ({
    page,
  }) => {
    await ready(page);
    await startPractice(page);
    await page.clock.runFor(2000);
    await aligned(page, 0, 76);
    await aligned(page, 1, 75);
    await page.locator(".keyboard-viewport").evaluate((element) => {
      element.scrollLeft = 90;
    });
    await aligned(page, 0, 76);
    const status = (await page.locator(".roll-status").boundingBox())!;
    const viewport = (await page.locator(".keyboard-viewport").boundingBox())!;
    expect(status.x).toBeGreaterThanOrEqual(viewport.x);
    expect(status.x + status.width).toBeLessThanOrEqual(
      viewport.x + viewport.width,
    );
    const target = page.locator('.piano-key[data-expected="true"]');
    await target.scrollIntoViewIfNeeded();
    await target.tap();
    await page.clock.runFor(250);
    await expect(
      page.getByRole("progressbar", { name: "연습 진행" }),
    ).toHaveAttribute("value", "1");
    await aligned(page, 1, 75);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await page.screenshot({ path: "/tmp/still-piano-falling-mobile.png" });
  });
});
