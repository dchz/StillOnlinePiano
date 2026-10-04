import { useEffect, useMemo, useRef, useState } from "react";
import { isBlack, noteName } from "./music";
import type { PracticeState } from "./practice";
import type { LessonNote } from "./songs";
import {
  advancePracticeBeat,
  buildTimeline,
  pianoKeyGeometry,
  ROLL_LEAD_BEATS,
  ROLL_PIXELS_PER_BEAT,
} from "./pianoRoll";

type Props = {
  notes: LessonNote[];
  keys: number[];
  state: PracticeState;
  bpm: number;
  speed: number;
  previewStartedAt: number | null;
  activeNotes: number[];
};

export function FallingNotes({
  notes,
  keys,
  state,
  bpm,
  speed,
  previewStartedAt,
  activeNotes,
}: Props) {
  const timeline = useMemo(() => buildTimeline(notes), [notes]);
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const practiceBeat = useRef(-ROLL_LEAD_BEATS);
  const previous = useRef({ cursor: 0, laps: 0 });
  const [waiting, setWaiting] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(-1);
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
    const goal = timeline.entries[state.cursor]?.start ?? timeline.duration;
    if (
      state.status === "ready" ||
      state.laps !== previous.current.laps ||
      state.cursor < previous.current.cursor
    ) {
      practiceBeat.current = -ROLL_LEAD_BEATS;
    }
    // Early correct notes are accepted in this pitch-only practice mode.
    // Catch up to their onset so a played note never remains in the future.
    if (state.cursor > previous.current.cursor) {
      practiceBeat.current = Math.max(
        practiceBeat.current,
        timeline.entries[state.cursor - 1]?.start ?? 0,
      );
    }
    if (state.status === "complete")
      practiceBeat.current = timeline.duration + 1;
    previous.current = { cursor: state.cursor, laps: state.laps };
    let lastFrame = performance.now();
    let shownPreviewIndex = -1;
    setWaiting(false);
    setPreviewIndex(-1);

    const paint = (beat: number, motion: string) => {
      layer.current?.style.setProperty(
        "--roll-offset",
        `${beat * ROLL_PIXELS_PER_BEAT}px`,
      );
      if (root.current) {
        root.current.dataset.playhead = beat.toFixed(3);
        root.current.dataset.motion = motion;
      }
    };
    const tick = (now: number) => {
      if (previewStartedAt !== null) {
        const beat =
          ((now - previewStartedAt) / 1000) * ((bpm * speed) / 60) -
          ROLL_LEAD_BEATS;
        let index = -1;
        for (const entry of timeline.entries) {
          if (entry.start > beat) break;
          index = entry.index;
        }
        if (index !== shownPreviewIndex) {
          shownPreviewIndex = index;
          setPreviewIndex(index);
        }
        // Reduced motion keeps the same audio clock, displaying discrete positions.
        paint(
          reducedMotion
            ? (timeline.entries[index]?.start ?? -ROLL_LEAD_BEATS)
            : beat,
          "preview",
        );
        frame = requestAnimationFrame(tick);
      } else if (state.status === "practicing") {
        practiceBeat.current = reducedMotion
          ? goal
          : advancePracticeBeat(
              practiceBeat.current,
              (now - lastFrame) / 1000,
              (bpm * speed) / 60,
              goal,
            );
        const atLine = practiceBeat.current >= goal;
        paint(practiceBeat.current, atLine ? "waiting" : "moving");
        if (atLine) setWaiting(true);
        if (!atLine) frame = requestAnimationFrame(tick);
      }
      lastFrame = now;
    };

    paint(practiceBeat.current, state.status);
    if (previewStartedAt !== null || state.status === "practicing")
      frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    timeline,
    state.cursor,
    state.laps,
    state.status,
    bpm,
    speed,
    previewStartedAt,
    reducedMotion,
  ]);

  const current = previewStartedAt !== null ? previewIndex : state.cursor;
  const upcoming = timeline.entries
    .slice(state.cursor, state.cursor + 7)
    .map((entry) => noteName(entry.midi))
    .join(", ");
  const status =
    previewStartedAt !== null
      ? "미리 듣기 · 막대가 선에 닿으면 소리가 나요"
      : state.status === "complete"
        ? "선율을 끝까지 연주했어요"
        : state.status === "paused"
          ? "일시정지 · 이어서 연습할 수 있어요"
          : state.status === "ready"
            ? "연습을 시작하면 음표가 내려와요"
            : waiting
              ? "표시된 건반을 눌러 주세요"
              : "막대가 건반에 닿을 때 연주하세요";

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
              className={`falling-note ${isBlack(entry.midi) ? "falling-note-black" : ""} ${entry.index === current ? "falling-note-current" : ""} ${previewStartedAt === null && entry.index < state.cursor ? "falling-note-played" : ""}`}
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
        <span
          className={waiting ? "roll-status-dot waiting" : "roll-status-dot"}
        />
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
