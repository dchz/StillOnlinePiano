import { expect, type Page } from "@playwright/test";
export const roll = (page: Page) => page.locator(".falling-notes");
export const progress = (page: Page) =>
  page.getByRole("progressbar", { name: "연습 진행" });
export const beat = async (page: Page) =>
  Number(await roll(page).getAttribute("data-playhead"));
export async function ready(page: Page, freezeClock = true) {
  await page.goto("/");
  await expect(page.getByText("연주할 준비가 되었어요")).toBeVisible();
  await page.getByRole("button", { name: "곡 연습", exact: false }).click();
  if (!freezeClock) return;
  await page.clock.install({ time: new Date("2026-10-04T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-04T00:00:01Z"));
}
export async function start(page: Page, name = "연습 시작") {
  await page.getByRole("button", { name, exact: true }).click();
  // Native AudioContext.resume() must finish before the test advances its clock.
  await expect(
    page.getByRole("button", { name: "일시정지", exact: true }),
  ).toBeVisible();
  await expect(roll(page)).toHaveAttribute("data-motion", "moving");
}
export async function aligned(page: Page, index: number, note: number) {
  const a = (await page.locator(`[data-roll-index="${index}"]`).boundingBox())!;
  const b = (await page.locator(`[data-note="${note}"]`).boundingBox())!;
  expect(Math.abs(a.x + a.width / 2 - b.x - b.width / 2)).toBeLessThan(1.1);
}
