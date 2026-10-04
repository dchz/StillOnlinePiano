import { describe, expect, it } from "vitest";
import {
  initialPractice,
  practiceReducer,
  type PracticeState,
} from "./practice";
import { keyboardOctaveFor, lessonNotes, SONGS } from "./songs";

describe("self-paced practice", () => {
  it("requires the correct pitch and octave and ignores input before starting or while paused", () => {
    expect(practiceReducer(initialPractice, { type: "note", note: 76 })).toBe(
      initialPractice,
    );
    let state = practiceReducer(initialPractice, { type: "start" });
    state = practiceReducer(state, { type: "note", note: 64 }); // E4 is not E5.
    expect(state.cursor).toBe(0);
    expect(state.mistakes).toBe(1);
    state = practiceReducer(state, { type: "note", note: 76 });
    expect(state.cursor).toBe(1);
    state = practiceReducer(state, { type: "pause" });
    expect(practiceReducer(state, { type: "note", note: 75 })).toBe(state);
    state = practiceReducer(state, { type: "start" });
    expect(practiceReducer(state, { type: "note", note: 75 }).cursor).toBe(2);
  });

  it("completes once, ignores extra notes, and restarts without carrying old scores", () => {
    let state = practiceReducer(initialPractice, {
      type: "section",
      section: 0,
    });
    state = practiceReducer(state, { type: "start" });
    state = practiceReducer(state, { type: "note", note: 60 });
    for (const note of SONGS[0].sections[0].notes)
      state = practiceReducer(state, { type: "note", note: note.midi });
    expect(state).toMatchObject({
      status: "complete",
      cursor: 9,
      laps: 1,
      mistakes: 1,
    });
    expect(practiceReducer(state, { type: "note", note: 69 })).toBe(state);
    expect(practiceReducer(state, { type: "start" })).toMatchObject({
      status: "practicing",
      cursor: 0,
      laps: 0,
      mistakes: 0,
    });
  });

  it("loops only the selected phrase and resets when the song or section changes", () => {
    let state: PracticeState = {
      ...initialPractice,
      status: "practicing",
      loop: true,
      section: 0,
    };
    for (let pass = 0; pass < 2; pass++) {
      for (const note of SONGS[0].sections[0].notes)
        state = practiceReducer(state, { type: "note", note: note.midi });
    }
    expect(state).toMatchObject({ status: "practicing", cursor: 0, laps: 2 });
    state = practiceReducer(state, { type: "section", section: 1 });
    expect(state).toMatchObject({ status: "ready", cursor: 0, laps: 0 });
    state = practiceReducer(state, { type: "select", songId: "gymnopedie-1" });
    expect(state).toMatchObject({
      songId: "gymnopedie-1",
      section: null,
      status: "ready",
      loop: false,
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
