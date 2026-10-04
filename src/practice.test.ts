import { describe, expect, it } from "vitest";
import {
  initialPractice,
  practiceReducer,
  type PracticeState,
} from "./practice";
import { keyboardOctaveFor, lessonNotes, SONGS } from "./songs";

describe("automatic practice progress", () => {
  it("uses playback position and resets the selected section without carrying progress", () => {
    let state: PracticeState = practiceReducer(initialPractice, {
      type: "playback",
      position: { beat: 3, cursor: 9, laps: 1, status: "complete" },
    });
    expect(state).toMatchObject({ cursor: 9, laps: 1, status: "complete" });
    state = practiceReducer(state, { type: "section", section: 0 });
    expect(state).toMatchObject({
      cursor: 0,
      laps: 0,
      status: "ready",
      section: 0,
    });
    state = practiceReducer(state, { type: "loop" });
    expect(state.loop).toBe(true);
    state = practiceReducer(state, { type: "select", songId: "gymnopedie-1" });
    expect(state).toMatchObject({
      songId: "gymnopedie-1",
      section: null,
      loop: false,
      status: "ready",
    });
    expect(practiceReducer(state, { type: "section", section: 99 })).toBe(
      state,
    );
  });
});

describe("catalog integrity", () => {
  it("keeps every target reachable on the computer keyboard, including Satie's octave transitions", () => {
    for (const song of SONGS) {
      let octave = 4;
      for (const note of lessonNotes(song, null)) {
        octave = keyboardOctaveFor(note.midi, octave);
        const offset = note.midi - (octave + 1) * 12;
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThan(18);
        expect(note.beats).toBeGreaterThan(0);
      }
    }
  });

  it("records a separate public-domain edition for every original composition", () => {
    expect(new Set(SONGS.map((song) => song.id)).size).toBe(SONGS.length);
    for (const song of SONGS) {
      expect(song.source.license).toBe("Public Domain");
      expect(song.source.composerDeathYear + 70).toBeLessThan(2026);
      expect(song.source.publicationYear).toBeLessThan(1931);
      expect(song.source.typesetter).toBeTruthy();
      expect(song.source.changes).toBeTruthy();
    }
    // A tie across Satie bars 9–12 is one 12-beat note, not four keystrokes.
    expect(SONGS[1].sections[0].notes.at(-1)).toMatchObject({
      midi: 66,
      beats: 12,
    });
  });
});
