import { SONGS } from "./songs";
import type { PlaybackPosition } from "./lessonPlayer";

export type PracticeState = {
  songId: string;
  section: number | null;
  cursor: number;
  status: "ready" | "practicing" | "paused" | "complete";
  loop: boolean;
  laps: number;
};

export const initialPractice: PracticeState = {
  songId: SONGS[0].id,
  section: null,
  cursor: 0,
  status: "ready",
  loop: false,
  laps: 0,
};

export type PracticeAction =
  | { type: "select"; songId: string }
  | { type: "section"; section: number | null }
  | { type: "reset" }
  | { type: "loop" }
  | { type: "playback"; position: PlaybackPosition };

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
        laps: 0,
        status: "ready",
      };
    case "reset":
      return { ...state, cursor: 0, laps: 0, status: "ready" };
    case "loop":
      return { ...state, loop: !state.loop };
    case "playback": {
      const { cursor, laps, status } = action.position;
      return state.cursor === cursor &&
        state.laps === laps &&
        state.status === status
        ? state
        : { ...state, cursor, laps, status };
    }
  }
}
