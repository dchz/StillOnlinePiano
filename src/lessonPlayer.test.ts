import { describe, expect, it, vi } from "vitest";
import { LessonPlayer } from "./lessonPlayer";
import { Performance } from "./music";

function setup() {
  const output = { noteOn: vi.fn(), stop: vi.fn() };
  const player = new LessonPlayer(
    [
      { midi: 76, beats: 1, gapAfter: 0.5 },
      { midi: 75, beats: 3 },
    ],
    60,
    output,
  );
  return { player, output };
}
describe("automatic lesson clock", () => {
  it("plays on arrival without input, preserves rests, and completes after the last note's duration", () => {
    const { player, output } = setup();
    player.start(0);
    player.tick(1999);
    expect(output.noteOn).not.toHaveBeenCalled();
    player.tick(2000);
    expect(output.noteOn).toHaveBeenLastCalledWith("lesson:0:0", 76);
    player.tick(2950);
    expect(output.stop).toHaveBeenLastCalledWith("lesson:0:0");
    player.tick(3400);
    expect(output.noteOn).toHaveBeenCalledTimes(1);
    player.tick(3500);
    expect(output.noteOn).toHaveBeenLastCalledWith("lesson:0:1", 75);
    expect(player.tick(6400).status).toBe("practicing");
    expect(player.tick(6500)).toMatchObject({
      beat: 4.5,
      cursor: 2,
      laps: 1,
      status: "complete",
    });
  });
  it("freezes mid-note, resumes the remaining duration and changes speed without jumping", () => {
    const { player, output } = setup();
    player.start(0);
    player.pause(4000);
    expect(player.tick(9000).beat).toBe(2);
    player.start(10000);
    expect(output.noteOn).toHaveBeenLastCalledWith("lesson:0:1", 75);
    player.setSpeed(0.5, 11000);
    expect(player.tick(12000).beat).toBe(3.5);
    expect(player.tick(14000).status).toBe("complete");
    player.start(15000);
    expect(player.position).toMatchObject({
      beat: -2,
      cursor: 0,
      laps: 0,
      status: "practicing",
    });
  });
  it("repeats the phrase with a lead-in and can turn looping off during playback", () => {
    const { player } = setup();
    player.loop = true;
    player.start(0);
    expect(player.tick(6600)).toMatchObject({
      laps: 1,
      cursor: 0,
      status: "practicing",
    });
    expect(player.position.beat).toBeCloseTo(-1.9);
    player.loop = false;
    expect(player.tick(13000)).toMatchObject({
      laps: 2,
      cursor: 2,
      status: "complete",
    });
  });
  it("skips expired notes after delayed frames and reset silences the automatic voice", () => {
    const { player, output } = setup();
    player.start(0);
    player.tick(4000);
    expect(output.noteOn.mock.calls).toEqual([["lesson:0:1", 75]]);
    player.reset();
    expect(output.stop).toHaveBeenCalledWith("lesson:0:1");
    expect(player.tick(8000)).toMatchObject({ beat: -2, status: "ready" });
  });
  it("manual notes and pedals cannot release or extend an automatic note of the same pitch", () => {
    const released = vi.fn();
    const performance = new Performance(vi.fn(), released);
    const player = new LessonPlayer([{ midi: 76, beats: 1 }], 60, {
      noteOn: (id, note) => performance.noteOn(id, note, 0.65, "lesson"),
      stop: (id) => performance.stop(id),
    });
    player.start(0);
    player.tick(2000);
    performance.sustain(true);
    performance.noteOn("keyboard:Semicolon", 76);
    performance.noteOff("keyboard:Semicolon");
    expect(released).not.toHaveBeenCalledWith("lesson:0:0");
    player.tick(2950);
    expect(released).toHaveBeenCalledWith("lesson:0:0");
    expect(player.position.status).toBe("practicing");
  });
});
