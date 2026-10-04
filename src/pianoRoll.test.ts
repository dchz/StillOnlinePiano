import { describe, expect, it } from "vitest";
import { buildTimeline, pianoKeyGeometry } from "./pianoRoll";

describe("piano roll timing", () => {
  it("preserves rests and long tied notes on one shared musical timeline", () => {
    const timeline = buildTimeline([
      { midi: 69, beats: 0.5, gapAfter: 0.25 },
      { midi: 66, beats: 12 },
      { midi: 78, beats: 1 },
    ]);
    expect(timeline.entries.map(({ start, end }) => [start, end])).toEqual([
      [0, 0.5],
      [0.75, 12.75],
      [12.75, 13.75],
    ]);
    expect(timeline.duration).toBe(13.75);
  });
});

it("aligns black keys at white-key boundaries, with white keys centered in their own lanes", () => {
  const keys = Array.from({ length: 25 }, (_, i) => 60 + i);
  const c = pianoKeyGeometry(60, keys);
  const cs = pianoKeyGeometry(61, keys);
  const d = pianoKeyGeometry(62, keys);
  expect(c.left).toBe(0);
  expect(cs.center).toBeCloseTo(c.left + c.width);
  expect(cs.center).toBeCloseTo((c.center + d.center) / 2);
  expect(cs.width / c.width).toBeCloseTo(0.62);
  const last = pianoKeyGeometry(84, keys);
  expect(last.left + last.width).toBeCloseTo(100);
});
