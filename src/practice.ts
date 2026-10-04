import { lessonNotes, SONGS } from "./songs";

export type PracticeState = {
  songId: string;
  section: number | null;
  cursor: number;
  mistakes: number;
  status: "ready" | "practicing" | "paused" | "complete";
  loop: boolean;
  laps: number;
};

export const initialPractice: PracticeState = {
  songId: SONGS[0].id,
  section: null,
  cursor: 0,
  mistakes: 0,
  status: "ready",
  loop: false,
  laps: 0,
};

export type PracticeAction =
  | { type: "select"; songId: string }
  | { type: "section"; section: number | null }
  | { type: "start" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "loop" }
  | { type: "note"; note: number };

export function practiceReducer(
  state: PracticeState,
  action: PracticeAction,
): PracticeState {
  const song = SONGS.find((item) => item.id === state.songId)!;
  switch (action.type) {
    case "select":
      return SONGS.some((item) => item.id === action.songId)
        ? { ...initialPractice, songId: action.songId }
        : state;
    case "section":
      if (action.section !== null && !song.sections[action.section])
        return state;
      return {
        ...state,
        section: action.section,
        cursor: 0,
        mistakes: 0,
        laps: 0,
        status: "ready",
      };
    case "start":
      return state.status === "complete"
        ? { ...state, cursor: 0, mistakes: 0, laps: 0, status: "practicing" }
        : { ...state, status: "practicing" };
    case "pause":
      return state.status === "practicing"
        ? { ...state, status: "paused" }
        : state;
    case "reset":
      return { ...state, cursor: 0, mistakes: 0, laps: 0, status: "ready" };
    case "loop":
      return { ...state, loop: !state.loop };
    case "note": {
      if (state.status !== "practicing") return state;
      const notes = lessonNotes(song, state.section);
      if (notes[state.cursor].midi !== action.note)
        return { ...state, mistakes: state.mistakes + 1 };
      if (state.cursor + 1 < notes.length)
        return { ...state, cursor: state.cursor + 1 };
      return state.loop
        ? { ...state, cursor: 0, laps: state.laps + 1 }
        : {
            ...state,
            cursor: notes.length,
            status: "complete",
            laps: state.laps + 1,
          };
    }
  }
}
