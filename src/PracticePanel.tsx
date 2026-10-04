import {
  Check,
  ChevronRight,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
} from "lucide-react";
import type { Dispatch } from "react";
import type { PracticeAction, PracticeState } from "./practice";
import { lessonNotes, SONGS } from "./songs";

type PracticeProps = {
  state: PracticeState;
  dispatch: Dispatch<PracticeAction>;
  onStop: () => void;
};

export function SongLibrary({ state, dispatch, onStop }: PracticeProps) {
  return (
    <section className="practice-section" aria-labelledby="practice-title">
      <div className="practice-heading">
        <div>
          <p className="eyebrow">A MELODY AT A TIME</p>
          <h2 id="practice-title">아는 멜로디가, 나의 연주로.</h2>
        </div>
        <span className="pd-label">퍼블릭 도메인 원곡 · 2곡</span>
      </div>
      <div className="song-library" aria-label="연습곡 선택">
        {SONGS.map((song, index) => (
          <button
            key={song.id}
            className={`song-card ${state.songId === song.id ? "selected" : ""}`}
            aria-pressed={state.songId === song.id}
            onClick={() => {
              onStop();
              dispatch({ type: "select", songId: song.id });
            }}
          >
            <span className="song-number">0{index + 1}</span>
            <span className="song-copy">
              <span className="song-composer">{song.composer}</span>
              <strong>{song.title}</strong>
              <span className="song-description">{song.description}</span>
              <span className="song-meta">
                단선율 발췌 · {lessonNotes(song, null).length}음
              </span>
            </span>
            {state.songId === song.id ? (
              <Check size={18} aria-hidden="true" />
            ) : (
              <ChevronRight size={18} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

type ControlsProps = PracticeProps & {
  speed: number;
  disabled: boolean;
  onSpeed: (speed: number) => void;
  onStart: () => void;
};

export function PracticeControls({
  state,
  dispatch,
  speed,
  disabled,
  onSpeed,
  onStart,
  onStop,
}: ControlsProps) {
  const song = SONGS.find((item) => item.id === state.songId)!;
  const notes = lessonNotes(song, state.section);
  const choose = (action: PracticeAction) => {
    onStop();
    dispatch(action);
  };

  return (
    <div className="practice-controls" role="group" aria-label="연습 재생 조절">
      <div className="lesson-actions">
        {state.status === "practicing" ? (
          <button className="lesson-primary" onClick={onStop}>
            <Pause size={15} aria-hidden="true" />
            일시정지
          </button>
        ) : (
          <button
            className="lesson-primary"
            onClick={onStart}
            disabled={disabled}
          >
            <Play size={15} aria-hidden="true" />
            {state.status === "paused"
              ? "이어서 연습"
              : state.status === "complete"
                ? "다시 연습"
                : "연습 시작"}
          </button>
        )}
        <button
          className="lesson-secondary"
          onClick={() => choose({ type: "reset" })}
        >
          <RotateCcw size={15} aria-hidden="true" />
          처음부터
        </button>
        <button
          className={`lesson-secondary loop-button ${state.loop ? "active" : ""}`}
          aria-label="선택 구간 반복"
          aria-pressed={state.loop}
          onClick={() => dispatch({ type: "loop" })}
        >
          <Repeat2 size={15} aria-hidden="true" />
          구간 반복
        </button>
      </div>
      <div className="lesson-settings">
        <label>
          연습 구간
          <select
            value={state.section ?? "all"}
            onChange={(event) =>
              choose({
                type: "section",
                section:
                  event.target.value === "all"
                    ? null
                    : Number(event.target.value),
              })
            }
          >
            <option value="all">발췌 전체</option>
            {song.sections.map((part, index) => (
              <option key={index} value={index}>
                {part.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          진행 속도
          <select
            value={speed}
            onChange={(event) => onSpeed(Number(event.target.value))}
          >
            <option value={0.5}>0.5배</option>
            <option value={0.75}>0.75배</option>
            <option value={1}>1배</option>
            <option value={1.25}>1.25배</option>
          </select>
        </label>
      </div>
      <div className="lesson-sequence">
        <span className="lesson-progress-label">
          {state.cursor} / {notes.length}음
        </span>
        <progress
          aria-label="연습 진행"
          value={state.cursor}
          max={notes.length}
        />
        {state.laps > 0 && (
          <span className="lesson-progress-label">{state.laps}회 재생</span>
        )}
      </div>
    </div>
  );
}

export function SongSource({ songId }: { songId: string }) {
  const song = SONGS.find((item) => item.id === songId)!;
  return (
    <details className="song-source">
      <summary>발췌 범위와 악보 출처</summary>
      <p>
        <strong>{song.originalTitle}</strong> · {song.composer} ({song.years})
      </p>
      <p>
        {song.excerpt}. {song.source.changes}
      </p>
      <p>
        원곡: {song.source.publicationYear}년 출판, 작곡가{" "}
        {song.source.composerDeathYear}년 사망. 대한민국·미국·EU의 일반 보호기간
        기준으로 퍼블릭 도메인에 해당합니다.
      </p>
      <p>
        악보: {song.source.edition}. {song.source.typesetter}가 사보한 원문의
        이용 표시: <strong>{song.source.license}</strong>.
      </p>
      <p>
        <a href={song.source.url} target="_blank" rel="noreferrer">
          Mutopia 출처 보기 ↗
        </a>
        <a
          href={`${import.meta.env.BASE_URL}scores/${song.source.file}`}
          target="_blank"
          rel="noreferrer"
        >
          사용한 악보 원문 ↗
        </a>
      </p>
    </details>
  );
}
