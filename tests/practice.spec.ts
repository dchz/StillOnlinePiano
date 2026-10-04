import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessonNotes, SONGS } from "../src/songs";

const progress = (page: Page) =>
  page.getByRole("progressbar", { name: "연습 진행" });
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByText("연주할 준비가 되었어요")).toBeVisible();
  await page.getByRole("button", { name: "곡 연습", exact: false }).click();
}
async function playExpected(page: Page, note: number) {
  const target = page.locator('.piano-key[data-expected="true"]');
  await expect(target).toHaveAttribute("data-note", String(note));
  const label = await target.locator(".key-label").innerText();
  expect(label).not.toBe("");
  await page.keyboard.press(label.toLowerCase());
}

test("waits for the right note, pauses on focus loss, and resumes at the same position", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "연습 시작", exact: true }).click();
  await page.keyboard.press("a");
  await expect(progress(page)).toHaveAttribute("value", "0");
  await playExpected(page, 76);
  await expect(progress(page)).toHaveAttribute("value", "1");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("button", { name: "이어서 연습" })).toBeVisible();
  await page.keyboard.press("p");
  await expect(progress(page)).toHaveAttribute("value", "1");
  await page.getByRole("button", { name: "이어서 연습" }).click();
  await playExpected(page, 75);
  await expect(progress(page)).toHaveAttribute("value", "2");
  await page.getByRole("button", { name: "사용 가이드" }).click();
  await page.keyboard.press(";");
  await page.keyboard.press("Escape");
  await expect(progress(page)).toHaveAttribute("value", "2");
  await expect(page.getByRole("button", { name: "이어서 연습" })).toBeVisible();
});

for (const song of SONGS) {
  test(`completes ${song.id} using the displayed keyboard mapping`, async ({
    page,
  }) => {
    await ready(page);
    await page.getByRole("button", { name: new RegExp(song.title) }).click();
    await page.getByRole("button", { name: "연습 시작", exact: true }).click();
    for (const [index, note] of lessonNotes(song, null).entries()) {
      await playExpected(page, note.midi);
      await expect(progress(page)).toHaveAttribute("value", String(index + 1));
    }
    await expect(page.getByText("선율을 끝까지 연주했어요!")).toBeVisible();
    await expect(page.locator(".piano-key.expected-key")).toHaveCount(0);
    await page.getByRole("button", { name: "다시 연습", exact: true }).click();
    await expect(progress(page)).toHaveAttribute("value", "0");
  });
}

test("section repeat restarts the selected phrase and changing songs clears progress", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("연습 구간").selectOption("0");
  await page.getByRole("button", { name: "선택 구간 반복" }).click();
  await page.getByRole("button", { name: "연습 시작", exact: true }).click();
  for (const note of SONGS[0].sections[0].notes)
    await playExpected(page, note.midi);
  await expect(progress(page)).toHaveAttribute("value", "0");
  await expect(page.getByText("1회 완주", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "일시정지", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /짐노페디 1번/ }).click();
  await expect(page.getByLabel("연습 구간")).toHaveValue("all");
  await expect(
    page.getByRole("button", { name: "연습 시작", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "선택 구간 반복" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("preview produces audio notes without advancing practice and cancels cleanly", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("연습 구간").selectOption("0");
  await page.getByRole("button", { name: "연습 시작", exact: true }).click();
  await page.getByRole("button", { name: "선율 미리 듣기" }).click();
  await expect(page.getByRole("button", { name: "듣기 멈추기" })).toBeVisible();
  await expect
    .poll(() => page.locator(".piano-key.pressed").count())
    .toBeGreaterThan(0);
  await expect(progress(page)).toHaveAttribute("value", "0");
  await page.keyboard.press(";");
  await expect(
    page.getByRole("button", { name: "선율 미리 듣기" }),
  ).toBeVisible();
  await expect(progress(page)).toHaveAttribute("value", "0");
  await expect(page.getByRole("button", { name: "이어서 연습" })).toBeVisible();
  await page.getByRole("button", { name: "선율 미리 듣기" }).click();
  await page.getByRole("button", { name: "자유 연주", exact: true }).click();
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
  await page.getByRole("button", { name: "곡 연습", exact: false }).click();
  await expect(progress(page)).toHaveAttribute("value", "0");
});

test("MIDI note-on advances practice, while note-off and pedals do not", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const input = {
      id: "practice-midi",
      name: "Practice Piano",
      state: "connected",
      onmidimessage: null,
    };
    (window as any).__practiceMidi = input;
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: () =>
        Promise.resolve({
          inputs: new Map([[input.id, input]]),
          onstatechange: null,
        }),
    });
  });
  await ready(page);
  await page.getByRole("button", { name: "MIDI 연결", exact: true }).click();
  await expect(page.getByText(/Practice Piano 연결됨/)).toBeVisible();
  await page.getByRole("button", { name: "연습 시작", exact: true }).click();
  const send = (data: number[]) =>
    page.evaluate(
      (bytes) =>
        (window as any).__practiceMidi.onmidimessage({
          data: new Uint8Array(bytes),
        }),
      data,
    );
  await send([0x90, 76, 100]);
  await expect(progress(page)).toHaveAttribute("value", "1");
  await send([0x90, 75, 0]);
  await send([0xb0, 64, 127]);
  await expect(progress(page)).toHaveAttribute("value", "1");
  await send([0x90, 75, 100]);
  await expect(progress(page)).toHaveAttribute("value", "2");
});

test("practice controls meet WCAG AA and expose the exact score sources", async ({
  page,
  request,
}) => {
  await ready(page);
  await page.getByText("발췌 범위와 악보 출처", { exact: true }).click();
  await expect(page.getByText(/Stelios Samelis/)).toBeVisible();
  const response = await request.get(
    (await page
      .getByRole("link", { name: "사용한 악보 원문" })
      .getAttribute("href"))!,
  );
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain('license = "Public Domain"');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.getByText("발췌 범위와 악보 출처", { exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "/tmp/still-piano-practice-desktop.png",
    fullPage: true,
  });
});

test.describe("mobile practice", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("scrolls the target into view and accepts touch input without page overflow", async ({
    page,
  }) => {
    await ready(page);
    await page.getByRole("button", { name: "연습 시작", exact: true }).click();
    const target = () => page.locator('.piano-key[data-expected="true"]');
    await target().scrollIntoViewIfNeeded();
    await target().tap();
    await expect(progress(page)).toHaveAttribute("value", "1");
    await target().tap();
    await expect(progress(page)).toHaveAttribute("value", "2");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await page.screenshot({
      path: "/tmp/still-piano-practice-mobile.png",
      fullPage: true,
    });
  });
});
