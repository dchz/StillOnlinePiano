import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { lessonNotes, SONGS } from "../src/songs";
import { buildTimeline, ROLL_LEAD_BEATS } from "../src/pianoRoll";
import { beat, progress, ready, roll, start } from "./practice-helpers";

test("automatically produces real audio and advances while correct, wrong and held keys leave the clock unchanged", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createDynamicsCompressor;
    AudioContext.prototype.createDynamicsCompressor = function () {
      const compressor = original.call(this);
      const meter = this.createAnalyser();
      compressor.connect(meter);
      (window as any).__audioMeter = meter;
      return compressor;
    };
  });
  await ready(page);
  await start(page);
  await page.clock.runFor(1700);
  await expect(page.locator('[data-note="76"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(Math.abs(await beat(page))).toBeLessThan(0.06);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const meter: AnalyserNode = (window as any).__audioMeter;
        const samples = new Float32Array(meter.fftSize);
        meter.getFloatTimeDomainData(samples);
        return Math.max(...samples.map(Math.abs));
      }),
    )
    .toBeGreaterThan(0.01);
  const before = await beat(page);
  await page.keyboard.press(";"); // Same pitch as the automatic note.
  await page.keyboard.down("a"); // Wrong pitch, held over the next onset.
  expect(await beat(page)).toBe(before);
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
  await page.keyboard.up("a");
  await page.clock.runFor(600);
  expect(await beat(page)).toBeGreaterThan(0.9);
  await expect(roll(page)).toHaveAttribute("data-motion", "moving");
});

for (const song of SONGS) {
  test(`finishes ${song.id} without any piano input and can restart`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await ready(page);
    await page.getByRole("button", { name: new RegExp(song.title) }).click();
    await start(page);
    const notes = lessonNotes(song, null);
    const totalMs =
      ((ROLL_LEAD_BEATS + buildTimeline(notes).duration) * 60000) / song.bpm;
    await page.clock.runFor(totalMs - 100);
    await expect(
      page.getByRole("button", { name: "일시정지", exact: true }),
    ).toBeVisible();
    await page.clock.runFor(150);
    await expect(
      page.getByText("선율 재생이 끝났어요!", { exact: true }),
    ).toBeVisible();
    await expect(progress(page)).toHaveAttribute("value", String(notes.length));
    await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
    await start(page, "다시 연습");
    await expect(progress(page)).toHaveAttribute("value", "0");
    expect(await beat(page)).toBe(-2);
  });
}

test("pause and focus loss freeze audio and position, then resume at the same musical moment", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: /짐노페디 1번/ }).click();
  await start(page);
  await page.clock.runFor(2100);
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  const paused = await beat(page);
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
  await page.clock.runFor(5000);
  expect(await beat(page)).toBe(paused);
  await start(page, "이어서 연습");
  await expect(page.locator('[data-note="78"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.clock.runFor(300);
  expect(await beat(page)).toBeGreaterThan(paused + 0.3);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(roll(page)).toHaveAttribute("data-motion", "paused");
  const blurred = await beat(page);
  await page.clock.runFor(5000);
  expect(await beat(page)).toBe(blurred);
  await start(page, "이어서 연습");
  await page.getByRole("button", { name: "사용 가이드" }).click();
  await expect(roll(page)).toHaveAttribute("data-motion", "paused");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "이어서 연습", exact: true }),
  ).toBeVisible();
});

test("speed changes preserve position and continuously adjust both the audio and visual clock", async ({
  page,
}) => {
  await ready(page);
  await start(page);
  await page.clock.runFor(1000);
  expect(await beat(page)).toBeCloseTo(-0.8, 1);
  const before = await beat(page);
  await page.getByLabel("진행 속도").selectOption("0.5");
  expect(Math.abs((await beat(page)) - before)).toBeLessThan(0.03);
  await page.clock.runFor(1000);
  expect(await beat(page)).toBeCloseTo(-0.2, 1);
  await page.clock.runFor(400);
  await expect(page.locator('[data-note="76"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "일시정지", exact: true }),
  ).toBeVisible();
});

test("repeats only the selected section automatically, and reset or selection cancels old playback", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("연습 구간").selectOption("0");
  await page.getByRole("button", { name: "선택 구간 반복" }).click();
  await start(page);
  const timeline = buildTimeline(SONGS[0].sections[0].notes);
  await page.clock.runFor(
    ((2 + timeline.duration) * 60000) / SONGS[0].bpm + 100,
  );
  await expect(page.getByText("1회 재생", { exact: true })).toBeVisible();
  expect(await beat(page)).toBeLessThan(-1.8);
  await page.getByRole("button", { name: "처음부터", exact: true }).click();
  await page.clock.runFor(3000);
  expect(await beat(page)).toBe(-2);
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
  await start(page);
  await page.clock.runFor(1700);
  await page.getByRole("button", { name: /짐노페디 1번/ }).click();
  await expect(page.getByLabel("연습 구간")).toHaveValue("all");
  await expect(
    page.getByRole("button", { name: "선택 구간 반복" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.clock.runFor(3000);
  await expect(progress(page)).toHaveAttribute("value", "0");
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
  await start(page);
  await page.clock.runFor(1700);
  await page.getByRole("button", { name: "자유 연주", exact: true }).click();
  await page.clock.runFor(3000);
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
});

test("MIDI note-on, note-off and pedals leave automatic music playing", async ({
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
  await start(page);
  await page.clock.runFor(1700);
  const send = (data: number[]) =>
    page.evaluate(
      (bytes) =>
        (window as any).__practiceMidi.onmidimessage({
          data: new Uint8Array(bytes),
        }),
      data,
    );
  const before = await beat(page);
  await send([0x90, 76, 100]);
  await send([0x80, 76, 0]);
  await send([0xb0, 64, 127]);
  expect(await beat(page)).toBe(before);
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
  await send([0xb0, 64, 0]);
  await page.clock.runFor(500);
  expect(await beat(page)).toBeGreaterThan(0.9);
});

test("practice controls meet WCAG AA and expose the exact score sources", async ({
  page,
  request,
}) => {
  await ready(page, false);
  await expect(page.getByText("연주할 준비가 되었어요")).toHaveCount(0);
  await expect(page.getByText(/헤드폰과 함께/)).toHaveCount(0);
  await expect(page.locator(".lesson-workspace")).toHaveCount(0);
  const keyboard = (await page.locator(".piano-keyboard").boundingBox())!;
  const speed = (await page.getByLabel("진행 속도").boundingBox())!;
  expect(speed.y).toBeGreaterThanOrEqual(keyboard.y + keyboard.height);
  await expect(page.locator(".site-footer .song-source")).toBeAttached();
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
});
