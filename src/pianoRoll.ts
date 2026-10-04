import { isBlack } from "./music";
import type { LessonNote } from "./songs";

export const ROLL_LEAD_BEATS = 2;
export const ROLL_PIXELS_PER_BEAT = 80;

export function buildTimeline(notes: LessonNote[]) {
  let beat = 0;
  const entries = notes.map((note, index) => {
    const start = beat;
    beat += note.beats + (note.gapAfter ?? 0);
    return { ...note, index, start, end: start + note.beats };
  });
  return { entries, duration: beat };
}

/** Geometry is in percentages of the SAME track used by the piano keyboard. */
export function pianoKeyGeometry(note: number, keys: number[]) {
  const whites = keys.filter((key) => !isBlack(key));
  const position = whites.filter((key) => key < note).length;
  const width = (100 / whites.length) * (isBlack(note) ? 0.62 : 1);
  const center = ((position + (isBlack(note) ? 0 : 0.5)) / whites.length) * 100;
  return { center, width, left: center - width / 2 };
}

/** Stop the whole score at the next unplayed onset; a late frame cannot skip it. */
export function advancePracticeBeat(
  beat: number,
  elapsedSeconds: number,
  beatsPerSecond: number,
  target: number,
) {
  return Math.min(target, beat + Math.max(0, elapsedSeconds) * beatsPerSecond);
}
