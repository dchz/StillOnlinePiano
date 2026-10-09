import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 60000 });

async function connect(page: Page) {
  await page.addInitScript(() => {
    const input = {
      id: "background-piano",
      name: "Background Piano",
      state: "connected",
      onmidimessage: null,
    };
    const access = {
      inputs: new Map([[input.id, input]]),
      onstatechange: null,
    };
    (window as any).__backgroundMidi = { input, access, released: [] };
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: () => Promise.resolve(access),
    });
    const originalSource = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = originalSource.call(this);
      const released: boolean[] = (window as any).__backgroundMidi.released;
      const index = released.push(false) - 1;
      const stop = source.stop.bind(source);
      source.stop = (when?: number) => {
        released[index] = true;
        stop(when);
      };
      return source;
    };
    const originalCompressor = AudioContext.prototype.createDynamicsCompressor;
    AudioContext.prototype.createDynamicsCompressor = function () {
      const compressor = originalCompressor.call(this);
      const meter = this.createAnalyser();
      compressor.connect(meter);
      (window as any).__backgroundMidi.context = this;
      (window as any).__backgroundMidi.meter = meter;
      return compressor;
    };
  });
  await page.goto("/");
  await expect(page.locator(".piano-studio")).toHaveAttribute(
    "data-sample-state",
    "ready",
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: "MIDI 연결", exact: true }).click();
  await expect(page.getByText(/Background Piano 연결됨/)).toBeVisible();
}

for (const mode of ["free", "practice"]) {
  test(`MIDI notes and pedal survive focus loss in ${mode} mode while local inputs release`, async ({
    page,
  }) => {
    await connect(page);
    if (mode === "practice")
      await page.getByRole("button", { name: "곡 연습", exact: false }).click();
    await page.locator(".keyboard-viewport").focus();
    await page.keyboard.down("a");
    await page.keyboard.down("Space");
    await expect(
      page.getByRole("button", { name: "서스테인", exact: false }),
    ).toHaveAttribute("aria-pressed", "true");
    const key = page.locator('[data-note="64"]');
    await key.scrollIntoViewIfNeeded();
    const box = (await key.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 20);
    await page.mouse.down();
    // Keep MIDI messages and waveform readings on the browser clock: a piano
    // attack can decay before a slow test runner makes its next protocol call.
    const result = await page.evaluate(async () => {
      const midi = (window as any).__backgroundMidi;
      const send = (data: number[]) =>
        midi.input.onmidimessage({ data: new Uint8Array(data) });
      const released = () => midi.released.slice(2) as boolean[];
      const waitKey = async (note: number, pressed: string) => {
        const deadline = performance.now() + 3000;
        while (performance.now() < deadline) {
          if (
            document
              .querySelector(`[data-note="${note}"]`)
              ?.getAttribute("aria-pressed") === pressed
          )
            return true;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        return false;
      };
      const measure = async () => {
        const samples = new Float32Array(midi.meter.fftSize);
        const deadline = performance.now() + 3000;
        while (performance.now() < deadline) {
          midi.meter.getFloatTimeDomainData(samples);
          const level = Math.max(...samples.map(Math.abs));
          if (level > 0.01) return level;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        return 0;
      };
      send([0x90, 60, 100]);
      send([0xb0, 64, 127]);
      send([0x90, 62, 100]);
      send([0x80, 62, 0]);
      const initialAudio = await measure();
      window.dispatchEvent(new Event("blur"));
      const afterBlur = released();
      const pointerReleased = await waitKey(64, "false");
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
      const afterHide = released();
      send([0x90, 64, 100]);
      const hiddenAudio = await measure();
      const hiddenKeyPressed = await waitKey(64, "true");
      send([0x80, 64, 0]);
      const withPedal = released();
      send([0xb0, 64, 0]);
      const pedalReleased = released();
      send([0x80, 60, 0]);
      const notesReleased = released();
      send([0x90, 65, 100]);
      midi.input.state = "disconnected";
      midi.access.onstatechange();
      return {
        initialAudio,
        afterBlur,
        pointerReleased,
        afterHide,
        hiddenAudio,
        hiddenKeyPressed,
        withPedal,
        pedalReleased,
        notesReleased,
        disconnected: released(),
      };
    });
    expect(result.initialAudio).toBeGreaterThan(0.01);
    expect(result.afterBlur).toEqual([false, false]);
    expect(result.pointerReleased).toBe(true);
    expect(result.afterHide).toEqual([false, false]);
    expect(result.hiddenAudio).toBeGreaterThan(0.01);
    expect(result.hiddenKeyPressed).toBe(true);
    expect(result.withPedal).toEqual([false, false, false]);
    expect(result.pedalReleased).toEqual([false, true, true]);
    expect(result.notesReleased).toEqual([true, true, true]);
    expect(result.disconnected).toEqual([true, true, true, true]);
    await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "서스테인", exact: false }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.mouse.up();
    await page.keyboard.up("a");
    await page.keyboard.up("Space");
  });
}

test("MIDI note-on resumes an already unlocked AudioContext while hidden", async ({
  page,
}) => {
  await connect(page);
  const result = await page.evaluate(async () => {
    const midi = (window as any).__backgroundMidi;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await midi.context.suspend();
    const before = midi.context.state;
    midi.input.onmidimessage({ data: new Uint8Array([0x90, 69, 100]) });
    const samples = new Float32Array(midi.meter.fftSize);
    const deadline = performance.now() + 5000;
    let peak = 0;
    while (performance.now() < deadline && peak <= 0.01) {
      midi.meter.getFloatTimeDomainData(samples);
      peak = Math.max(peak, ...samples.map(Math.abs));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const after = midi.context.state;
    midi.input.onmidimessage({ data: new Uint8Array([0x80, 69, 0]) });
    return { before, after, peak, released: midi.released };
  });
  expect(result.before).toBe("suspended");
  expect(result.after).toBe("running");
  expect(result.peak).toBeGreaterThan(0.01);
  expect(result.released).toEqual([true]);
  await expect(page.locator(".piano-key.pressed")).toHaveCount(0);
});
