import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const key = (page: Page, note: number) => page.locator(`[data-note="${note}"]`);

test("page and guide meet automated WCAG AA checks", async ({ page }) => {
  await ready(page);
  const scan = () =>
    new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
  expect((await scan()).violations).toEqual([]);
  await page.getByRole("button", { name: "사용 가이드" }).click();
  expect((await scan()).violations).toEqual([]);
});
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator(".piano-studio")).toHaveAttribute(
    "data-sample-state",
    "ready",
  );
}

test("loads a complete local instrument and plays a chord with real audio output", async ({
  page,
}) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:5173"))
      externalRequests.push(request.url());
  });
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createDynamicsCompressor;
    AudioContext.prototype.createDynamicsCompressor = function () {
      const compressor = original.call(this);
      const meter = this.createAnalyser();
      compressor.connect(meter);
      (window as any).__audioMeter = meter;
      (window as any).__audioContext = this;
      return compressor;
    };
  });
  await ready(page);
  await page.keyboard.down("a");
  await page.keyboard.down("d");
  await page.keyboard.down("g");
  for (const note of [60, 64, 67])
    await expect(key(page, note)).toHaveAttribute("aria-pressed", "true");
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
  expect(await page.evaluate(() => (window as any).__audioContext.state)).toBe(
    "running",
  );
  await page.keyboard.up("a");
  await page.keyboard.up("d");
  await page.keyboard.up("g");
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test("mouse glissando and overlapping keyboard ownership release independently", async ({
  page,
}) => {
  await ready(page);
  await key(page, 60).scrollIntoViewIfNeeded();
  const c = (await key(page, 60).boundingBox())!;
  const d = (await key(page, 62).boundingBox())!;
  await page.keyboard.down("a");
  await page.mouse.move(c.x + c.width / 2, c.y + c.height - 30);
  await page.mouse.down();
  await page.mouse.move(d.x + d.width / 2, d.y + d.height - 30);
  await expect(key(page, 60)).toHaveAttribute("aria-pressed", "true");
  await expect(key(page, 62)).toHaveAttribute("aria-pressed", "true");
  await page.mouse.up();
  await expect(key(page, 62)).toHaveAttribute("aria-pressed", "false");
  await expect(key(page, 60)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.up("a");
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
});

test("sustain retains every note of a pointer glissando until pedal release", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createBufferSource;
    (window as any).__releasedVoices = 0;
    AudioContext.prototype.createBufferSource = function () {
      const source = original.call(this);
      const stop = source.stop.bind(source);
      source.stop = (when?: number) => {
        (window as any).__releasedVoices++;
        stop(when);
      };
      return source;
    };
  });
  await ready(page);
  await page.getByRole("button", { name: "서스테인", exact: false }).click();
  await key(page, 60).scrollIntoViewIfNeeded();
  const c = (await key(page, 60).boundingBox())!;
  const d = (await key(page, 62).boundingBox())!;
  await page.mouse.move(c.x + c.width / 2, c.y + c.height - 30);
  await page.mouse.down();
  await page.mouse.move(d.x + d.width / 2, d.y + d.height - 30);
  await expect(key(page, 62)).toHaveAttribute("aria-pressed", "true");
  await page.mouse.up();
  expect(await page.evaluate(() => (window as any).__releasedVoices)).toBe(0);
  await page.getByRole("button", { name: "서스테인", exact: false }).click();
  expect(await page.evaluate(() => (window as any).__releasedVoices)).toBe(2);
});

test("octave changes, focus loss, pedal, labels, and volume behave correctly", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.down("Space");
  await expect(
    page.getByRole("button", { name: "서스테인", exact: false }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.up("Space");
  await expect(
    page.getByRole("button", { name: "서스테인", exact: false }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.down("a");
  await page.getByRole("button", { name: "옥타브 높이기" }).click();
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
  await page.keyboard.up("a");
  await page.keyboard.down("a");
  await expect(key(page, 72)).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
  await page.keyboard.up("a");
  await page.getByRole("button", { name: "키보드 표시" }).click();
  await expect(key(page, 72).locator(".key-label")).toHaveText("");
  await page.getByRole("slider", { name: "볼륨" }).fill("0");
  await page.reload();
  await expect(page.getByRole("slider", { name: "볼륨" })).toHaveValue("0");
});

test("demo can be interrupted by a live performance and guide restores focus", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "먼저 들어볼까요?" }).click();
  await expect(
    page.getByRole("button", { name: "미리 듣기 멈추기" }),
  ).toBeVisible();
  await expect
    .poll(() => page.locator(".piano-key.pressed").count())
    .toBeGreaterThan(0);
  await page.keyboard.down("a");
  await expect(
    page.getByRole("button", { name: "먼저 들어볼까요?" }),
  ).toBeVisible();
  await expect(key(page, 60)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.up("a");
  await page.getByRole("button", { name: "사용 가이드" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("a");
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "사용 가이드" })).toBeFocused();
});

test("sample loading failure keeps a usable fallback instrument", async ({
  page,
}) => {
  await page.route("**/audio/*.mp3", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.goto("/");
  await expect(
    page.getByText("기본 음색 사용 중 · 음원을 불러오지 못했어요"),
  ).toBeVisible();
  await page.keyboard.down("a");
  await expect(key(page, 60)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.up("a");
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
});

test("MIDI unsupported and permission-denied states explain the next action", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "requestMIDIAccess", {
      value: undefined,
      configurable: true,
    }),
  );
  await ready(page);
  await page.getByRole("button", { name: "MIDI 연결", exact: true }).click();
  await expect(
    page.getByText(/이 브라우저는 MIDI를 지원하지 않아요/),
  ).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "requestMIDIAccess", {
      value: () =>
        Promise.reject(new DOMException("Denied", "NotAllowedError")),
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "MIDI 연결", exact: true }).click();
  await expect(page.getByText(/MIDI 접근이 허용되지 않았어요/)).toBeVisible();
});

test("virtual MIDI discovery, note-on/off and unplug work through browser integration", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const input = {
      id: "test-piano",
      name: "Test Piano",
      state: "connected",
      onmidimessage: null,
    };
    const access = {
      inputs: new Map([["test-piano", input]]),
      onstatechange: null,
    };
    (window as any).__midiInput = input;
    (window as any).__midiAccess = access;
    Object.defineProperty(navigator, "requestMIDIAccess", {
      value: () => Promise.resolve(access),
      configurable: true,
    });
  });
  await ready(page);
  await page.getByRole("button", { name: "MIDI 연결", exact: true }).click();
  await expect(page.getByText(/Test Piano 연결됨/)).toBeVisible();
  await page.evaluate(() =>
    (window as any).__midiInput.onmidimessage({
      data: new Uint8Array([0x90, 60, 95]),
    }),
  );
  await expect(key(page, 60)).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() =>
    (window as any).__midiInput.onmidimessage({
      data: new Uint8Array([0x90, 60, 0]),
    }),
  );
  await expect(key(page, 60)).toHaveAttribute("aria-pressed", "false");
  await page.evaluate(() =>
    (window as any).__midiInput.onmidimessage({
      data: new Uint8Array([0x90, 64, 95]),
    }),
  );
  await page.evaluate(() => {
    (window as any).__midiInput.state = "disconnected";
    (window as any).__midiAccess.onstatechange();
  });
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
  await expect(page.getByText(/연결된 기기가 없어요/)).toBeVisible();
});

test.describe("mobile", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("fits the screen and plays two simultaneous touches", async ({
    page,
    context,
  }) => {
    await ready(page);
    const c = (await key(page, 60).boundingBox())!;
    const e = (await key(page, 64).boundingBox())!;
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: c.x + c.width / 2, y: c.y + c.height - 35, id: 1 },
        { x: e.x + e.width / 2, y: e.y + e.height - 35, id: 2 },
      ],
    });
    await expect(key(page, 60)).toHaveAttribute("aria-pressed", "true");
    await expect(key(page, 64)).toHaveAttribute("aria-pressed", "true");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    const scrollPosition = () =>
      page
        .locator(".keyboard-viewport")
        .evaluate((element) => element.scrollLeft);
    const initialScroll = await scrollPosition();
    await page.getByRole("button", { name: "낮은 건반 보기" }).click();
    expect(await scrollPosition()).toBeLessThan(initialScroll);
    await page.getByRole("button", { name: "높은 건반 보기" }).click();
    expect(await scrollPosition()).toBe(initialScroll);
    await page.screenshot({
      path: "/tmp/still-piano-mobile.png",
      fullPage: true,
    });
  });
});

test("desktop visual reference", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "/tmp/still-piano-desktop.png",
    fullPage: true,
  });
});
