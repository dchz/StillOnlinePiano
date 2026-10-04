import { useEffect, useMemo, useRef, useState } from "react";
import { isBlack, noteName } from "./music";
import type { PracticeState } from "./practice";
import type { LessonNote } from "./songs";
import type { LessonPlayer } from "./lessonPlayer";
import {
  buildTimeline,
  pianoKeyGeometry,
  ROLL_LEAD_BEATS,
  ROLL_PIXELS_PER_BEAT,
} from "./pianoRoll";

type Props = {
  notes: LessonNote[];
  keys: number[];
  state: PracticeState;
  player: LessonPlayer;
  activeNotes: number[];
};

export function FallingNotes({
  notes,
  keys,
  state,
  player,
  activeNotes,
}: Props) {
  const timeline = useMemo(() => buildTimeline(notes), [notes]);
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let frame = 0;
    const paint = () => {
      const position =
        state.status === "ready"
          ? { ...player.position, beat: -ROLL_LEAD_BEATS, status: "ready" }
          : player.position;
      const beat =
        reducedMotion && position.status !== "complete"
          ? (timeline.entries
              .filter((entry) => entry.start <= position.beat)
              .at(-1)?.start ?? -ROLL_LEAD_BEATS)
          : position.beat;
      layer.current?.style.setProperty(
        "--roll-offset",
        `${beat * ROLL_PIXELS_PER_BEAT}px`,
      );
      if (root.current) {
        root.current.dataset.playhead = position.beat.toFixed(3);
        root.current.dataset.motion =
          position.status === "practicing" ? "moving" : position.status;
      }
      if (state.status === "practicing") frame = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(frame);
  }, [player, timeline, reducedMotion, state.status]);

  const current = state.cursor;
  const upcoming = timeline.entries
    .slice(state.cursor, state.cursor + 7)
    .map((entry) => noteName(entry.midi))
    .join(", ");
  const status =
    state.status === "complete"
      ? "선율 재생이 끝났어요"
      : state.status === "paused"
        ? "일시정지 · 이어서 연습할 수 있어요"
        : state.status === "ready"
          ? "연습을 시작하면 음악이 자동으로 재생돼요"
          : "자동 재생 중 · 내려오는 음표에 맞춰 연주하세요";

  return (
    <div
      className="falling-notes"
      ref={root}
      role="img"
      aria-label={`내려오는 음표. 막대의 길이는 음의 길이입니다. 다음 음: ${upcoming || "완주"}`}
    >
      <div className="roll-lanes" aria-hidden="true">
        {keys.map((note) => {
          const geometry = pianoKeyGeometry(note, keys);
          return (
            <div
              key={note}
              className={`roll-lane ${isBlack(note) ? "roll-black-lane" : ""}`}
              style={{ left: `${geometry.left}%`, width: `${geometry.width}%` }}
            />
          );
        })}
      </div>
      <div className="roll-note-layer" ref={layer} aria-hidden="true">
        {timeline.entries.map((entry) => {
          const geometry = pianoKeyGeometry(entry.midi, keys);
          return (
            <div
              key={entry.index}
              data-roll-index={entry.index}
              data-roll-note={entry.midi}
              className={`falling-note ${isBlack(entry.midi) ? "falling-note-black" : ""} ${entry.index === current ? "falling-note-current" : ""} ${entry.index < state.cursor ? "falling-note-played" : ""}`}
              style={{
                left: `${geometry.center}%`,
                width: `${geometry.width * 0.78}%`,
                height: `${entry.beats * ROLL_PIXELS_PER_BEAT}px`,
                bottom: `${entry.start * ROLL_PIXELS_PER_BEAT}px`,
              }}
            >
              <span>{noteName(entry.midi)}</span>
            </div>
          );
        })}
      </div>
      <div className="roll-status" aria-hidden="true">
        <span className="roll-status-dot" />
        {status}
      </div>
      <div className="roll-hit-line" aria-hidden="true" />
      {activeNotes
        .filter((note) => keys.includes(note))
        .map((note) => (
          <div
            key={note}
            aria-hidden="true"
            className="roll-impact"
            style={{ left: `${pianoKeyGeometry(note, keys).center}%` }}
          />
        ))}
    </div>
  );
}
