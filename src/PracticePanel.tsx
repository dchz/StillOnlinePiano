import {
  Check,
  ChevronRight,
  Headphones,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
} from "lucide-react";
import type { Dispatch } from "react";
import { KEY_LABELS, noteName } from "./music";
import type { PracticeAction, PracticeState } from "./practice";
import { lessonNotes, SONGS } from "./songs";

type Props = {
  state: PracticeState;
  dispatch: Dispatch<PracticeAction>;
  octave: number;
  previewing: boolean;
  speed: number;
  disabled: boolean;
  onSpeed: (speed: number) => void;
  onStart: () => void;
  onStop: () => void;
  onPreview: () => void;
};

export function PracticePanel({
  state,
  dispatch,
  octave,
  previewing,
  speed,
  disabled,
  onSpeed,
  onStart,
  onStop,
  onPreview,
}: Props) {
  const song = SONGS.find((item) => item.id === state.songId)!;
  const notes = lessonNotes(song, state.section);
  const next = notes[state.cursor];
  const keyLabel = next ? KEY_LABELS[next.midi - (octave + 1) * 12] : undefined;
  const windowStart = Math.max(0, Math.min(state.cursor - 1, notes.length - 7));
  const choose = (action: PracticeAction) => {
    onStop();
    dispatch(action);
  };
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
        {SONGS.map((item, index) => (
          <button
            key={item.id}
            className={`song-card ${song.id === item.id ? "selected" : ""}`}
            aria-pressed={song.id === item.id}
            onClick={() => choose({ type: "select", songId: item.id })}
          >
            <span className="song-number">0{index + 1}</span>
            <span className="song-copy">
              <span className="song-composer">{item.composer}</span>
              <strong>{item.title}</strong>
              <span className="song-description">{item.description}</span>
              <span className="song-meta">
                단선율 발췌 · {lessonNotes(item, null).length}음
              </span>
            </span>
            {song.id === item.id ? (
              <Check size={18} aria-hidden="true" />
            ) : (
              <ChevronRight size={18} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      <div className="lesson-workspace">
        <div className="lesson-toolbar">
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
          <div className="listen-controls">
            <label>
              듣기 속도
              <select
                value={speed}
                onChange={(event) => {
                  onStop();
                  onSpeed(Number(event.target.value));
                }}
              >
                <option value={0.75}>0.75배</option>
                <option value={1}>1배</option>
                <option value={1.25}>1.25배</option>
              </select>
            </label>
            <button
              className="lesson-secondary"
              onClick={onPreview}
              disabled={disabled}
            >
              <Headphones size={15} />
              {previewing ? "듣기 멈추기" : "선율 미리 듣기"}
            </button>
          </div>
        </div>

        <div className="lesson-main">
          <div
            className="lesson-instruction"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {state.status === "complete" ? (
              <>
                <span className="lesson-kicker">WELL PLAYED</span>
                <h3>선율을 끝까지 연주했어요!</h3>
                <p>
                  {notes.length}음 완주 · 다른 음 {state.mistakes}회
                </p>
              </>
            ) : (
              <>
                <span className="lesson-kicker">
                  {previewing
                    ? "선율을 듣고 있어요"
                    : state.status === "paused"
                      ? "잠시 쉬는 중"
                      : state.status === "practicing"
                        ? "다음 음을 눌러 주세요"
                        : "준비되면 연습을 시작하세요"}
                </span>
                <h3>
                  <span>{noteName(next.midi)}</span>
                  {keyLabel && (
                    <>
                      <span className="note-to-key">키보드</span>
                      <kbd>{keyLabel}</kbd>
                    </>
                  )}
                </h3>
                <p>
                  {state.mistakes > 0
                    ? "괜찮아요. 표시된 음을 천천히 찾아보세요."
                    : "맞는 음을 누를 때까지 기다려 드릴게요."}
                </p>
              </>
            )}
          </div>
          <div className="lesson-sequence">
            <div className="lesson-progress-label">
              <span>
                {state.cursor} / {notes.length}음
              </span>
              <span>
                {state.laps > 0 ? `${state.laps}회 완주` : "나의 속도로"}
              </span>
            </div>
            <progress
              aria-label="연습 진행"
              value={state.cursor}
              max={notes.length}
            />
            <ol className="note-sequence" aria-label="선율 순서">
              {notes.slice(windowStart, windowStart + 7).map((note, index) => {
                const position = windowStart + index;
                return (
                  <li
                    key={position}
                    aria-current={
                      position === state.cursor ? "step" : undefined
                    }
                    className={
                      position < state.cursor
                        ? "note-done"
                        : position === state.cursor
                          ? "note-current"
                          : ""
                    }
                  >
                    <small>{position + 1}</small>
                    <span>{noteName(note.midi)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="lesson-actions">
          {state.status === "practicing" ? (
            <button className="lesson-primary" onClick={onStop}>
              <Pause size={15} />
              일시정지
            </button>
          ) : (
            <button
              className="lesson-primary"
              onClick={onStart}
              disabled={disabled}
            >
              <Play size={15} />
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
            <RotateCcw size={15} />
            처음부터
          </button>
          <button
            className={`lesson-secondary loop-button ${state.loop ? "active" : ""}`}
            aria-pressed={state.loop}
            onClick={() => dispatch({ type: "loop" })}
          >
            <Repeat2 size={15} />
            선택 구간 반복
          </button>
        </div>
        <p className="lesson-help">
          음높이와 순서를 익히는 연습이에요. 박자·누르는 길이는 채점하지 않아요.
          컴퓨터 키보드 음역은 다음 음에 맞춰 자동으로 이동해요.
        </p>
      </div>

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
          {song.source.composerDeathYear}년 사망. 대한민국·미국·EU의 일반
          보호기간 기준으로 퍼블릭 도메인에 해당합니다.
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
    </section>
  );
}
