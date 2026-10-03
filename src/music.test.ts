import { describe, expect, it, vi } from "vitest";
import {
  handleMidiMessage,
  keyboardNote,
  noteName,
  Performance,
} from "./music";

function instrument() {
  const attack = vi.fn();
  const release = vi.fn();
  const changed = vi.fn();
  return {
    attack,
    release,
    changed,
    performance: new Performance(attack, release, changed),
  };
}

describe("independent performance inputs", () => {
  it("releases only the owner when keyboard and pointer play the same note", () => {
    const { performance, release, changed } = instrument();
    performance.noteOn("keyboard:KeyA", 60);
    performance.noteOn("pointer:1", 60);
    performance.noteOff("pointer:1");
    expect(release.mock.calls).toEqual([["pointer:1"]]);
    expect(changed).toHaveBeenLastCalledWith([60]);
    performance.noteOff("keyboard:KeyA");
    expect(changed).toHaveBeenLastCalledWith([]);
  });

  it("sustains released notes, but keeps held notes when the pedal is lifted", () => {
    const { performance, release, changed } = instrument();
    performance.sustain(true);
    performance.noteOn("a", 60);
    performance.noteOn("s", 62);
    performance.noteOff("a");
    expect(release).not.toHaveBeenCalled();
    expect(changed).toHaveBeenLastCalledWith([62]);
    performance.sustain(false);
    expect(release.mock.calls).toEqual([["a"]]);
    performance.noteOff("s");
    expect(release).toHaveBeenLastCalledWith("s");
  });

  it("rearticulates the same note while the pedal is down", () => {
    const { performance, release, attack } = instrument();
    performance.sustain(true);
    performance.noteOn("a", 60);
    performance.noteOff("a");
    performance.noteOn("a", 60);
    expect(release).toHaveBeenCalledExactlyOnceWith("a");
    expect(attack).toHaveBeenCalledTimes(2);
  });

  it("panic clears held notes and pedals for subsequent playing", () => {
    const { performance, release, changed } = instrument();
    performance.sustain(true);
    performance.noteOn("a", 60);
    performance.noteOff("a");
    performance.stop();
    expect(release).toHaveBeenCalledWith("a");
    expect(changed).toHaveBeenLastCalledWith([]);
    performance.noteOn("b", 62);
    performance.noteOff("b");
    expect(release).toHaveBeenLastCalledWith("b");
  });
});

describe("MIDI protocol", () => {
  it("uses velocity and recognizes note-on with zero velocity as note-off", () => {
    const { performance, attack, release } = instrument();
    handleMidiMessage([0x91, 60, 100], "piano", performance);
    expect(attack).toHaveBeenCalledWith("midi:piano:1:60", 60, 100 / 127);
    handleMidiMessage([0x91, 60, 0], "piano", performance);
    expect(release).toHaveBeenCalledWith("midi:piano:1:60");
  });

  it("keeps pedals independent across MIDI channels and from typing", () => {
    const { performance, release } = instrument();
    handleMidiMessage([0xb0, 64, 127], "piano", performance);
    handleMidiMessage([0x90, 60, 90], "piano", performance);
    handleMidiMessage([0x91, 60, 90], "piano", performance);
    performance.noteOn("keyboard:KeyA", 60);
    handleMidiMessage([0x80, 60, 0], "piano", performance);
    handleMidiMessage([0x81, 60, 0], "piano", performance);
    performance.noteOff("keyboard:KeyA");
    expect(release.mock.calls).toEqual([
      ["midi:piano:1:60"],
      ["keyboard:KeyA"],
    ]);
    handleMidiMessage([0xb0, 64, 0], "piano", performance);
    expect(release).toHaveBeenLastCalledWith("midi:piano:0:60");
  });

  it("disconnect releases only that device, including its sustained notes", () => {
    const { performance, release, changed } = instrument();
    handleMidiMessage([0xb0, 64, 127], "one", performance);
    handleMidiMessage([0x90, 60, 90], "one", performance);
    handleMidiMessage([0x80, 60, 0], "one", performance);
    handleMidiMessage([0x90, 64, 90], "two", performance);
    performance.stop("midi:one:");
    expect(release).toHaveBeenCalledWith("midi:one:0:60");
    expect(changed).toHaveBeenLastCalledWith([64]);
    handleMidiMessage([0x90, 60, 90], "one", performance);
    handleMidiMessage([0x80, 60, 0], "one", performance);
    expect(release).toHaveBeenCalledTimes(2);
  });

  it.each([120, 123])(
    "honors controller %i as a channel stop",
    (controller) => {
      const { performance, release } = instrument();
      handleMidiMessage([0x90, 60, 90], "piano", performance);
      handleMidiMessage([0xb0, controller, 0], "piano", performance);
      expect(release).toHaveBeenCalledWith("midi:piano:0:60");
    },
  );

  it("ignores timing messages and notes beyond the sampled 88-key range", () => {
    const { performance, attack } = instrument();
    handleMidiMessage([0xf8], "piano", performance);
    handleMidiMessage([0x90, 20, 100], "piano", performance);
    handleMidiMessage([0x90, 109, 100], "piano", performance);
    expect(attack).not.toHaveBeenCalled();
  });
});

it("maps physical keys across octaves regardless of keyboard language", () => {
  expect(keyboardNote("KeyA", 4)).toBe(60);
  expect(keyboardNote("KeyW", 4)).toBe(61);
  expect(keyboardNote("Quote", 4)).toBe(77);
  expect(keyboardNote("KeyA", 2)).toBe(36);
  expect(keyboardNote("Enter", 4)).toBeNull();
  expect(noteName(60)).toBe("C4");
});
