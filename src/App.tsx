import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  ChevronRight,
  CircleHelp,
  Keyboard,
  LoaderCircle,
  MousePointer2,
  Piano,
  Play,
  PlugZap,
  Sparkles,
  Square,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { PianoAudio } from "./audio";
import type { SampleState } from "./audio";
import { PracticeControls, SongLibrary, SongSource } from "./PracticePanel";
import { FallingNotes } from "./FallingNotes";
import "./pianoRoll.css";
import { LessonPlayer } from "./lessonPlayer";
import { initialPractice, practiceReducer } from "./practice";
import { keyboardOctaveFor, lessonNotes, SONGS } from "./songs";
import {
  handleMidiMessage,
  isBlack,
  keyboardNote,
  KEY_CODES,
  KEY_LABELS,
  noteName,
} from "./music";

const DEMO: [number, number, number][] = [
  [0, 48, 1.8],
  [0, 60, 0.45],
  [0.5, 64, 0.45],
  [1, 67, 0.45],
  [1.5, 72, 0.85],
  [2.5, 45, 1.8],
  [2.5, 69, 0.45],
  [3, 64, 0.45],
  [3.5, 60, 0.45],
  [4, 64, 0.85],
  [5, 41, 1.8],
  [5, 65, 0.45],
  [5.5, 69, 0.45],
  [6, 72, 0.45],
  [6.5, 76, 0.85],
  [7.5, 43, 1.8],
  [7.5, 74, 0.45],
  [8, 71, 0.45],
  [8.5, 67, 0.45],
  [9, 62, 0.85],
  [10, 48, 2.5],
  [10, 60, 2.5],
  [10, 64, 2.5],
  [10, 67, 2.5],
  [10, 72, 2.5],
];

function readVolume() {
  try {
    const saved = localStorage.getItem("still-volume");
    const value = saved === null ? 70 : Number(saved);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 70;
  } catch {
    return 70;
  }
}

function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <span className="brand-icon">
        <i />
        <i />
        <i />
      </span>
      <span>
        Still<span className="brand-piano"> Online Piano</span>
      </span>
    </span>
  );
}

export default function App() {
  const [mode, setMode] = useState<"free" | "practice">("free");
  const [practice, dispatchPractice] = useReducer(
    practiceReducer,
    initialPractice,
  );
  const practiceEnabled = useRef(false);
  const [practiceSpeed, setPracticeSpeed] = useState(1);
  const song = SONGS.find((item) => item.id === practice.songId)!;
  const notes = useMemo(
    () => lessonNotes(song, practice.section),
    [song, practice.section],
  );
  const allSongNotes = useMemo(() => lessonNotes(song, null), [song]);
  const expectedNote =
    mode === "practice" ? notes[practice.cursor]?.midi : undefined;
  const audio = useRef<PianoAudio | null>(null);
  const lessonPlayer = useMemo(
    () =>
      new LessonPlayer(notes, song.bpm, {
        noteOn: (id, midi) =>
          audio.current?.performance.noteOn(id, midi, 0.65, "lesson"),
        stop: (id) => audio.current?.performance.stop(id),
      }),
    [notes, song.bpm],
  );
  const lessonPlayerRef = useRef(lessonPlayer);
  lessonPlayerRef.current = lessonPlayer;
  const [sampleState, setSampleState] = useState<SampleState>("loading");
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [volume, setVolume] = useState(readVolume);
  const [reverb, setReverb] = useState(true);
  const [labels, setLabels] = useState(true);
  const [octave, setOctave] = useState(4);
  const [latchedSustain, setLatchedSustain] = useState(false);
  const [spaceSustain, setSpaceSustain] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [midiNames, setMidiNames] = useState<string[]>([]);
  const [midiBusy, setMidiBusy] = useState(false);
  const [midiMessage, setMidiMessage] = useState("");
  const [audioMessage, setAudioMessage] = useState("");
  const guide = useRef<HTMLDialogElement>(null);
  const keyboardViewport = useRef<HTMLDivElement>(null);
  const midi = useRef<MIDIAccess | null>(null);
  const attachedInputs = useRef<Map<string, MIDIInput>>(new Map());
  const pointers = useRef(new Map<number, number>());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const demoGeneration = useRef(0);
  const lessonGeneration = useRef(0);
  const sustain = latchedSustain || spaceSustain;

  const stopDemo = useCallback(() => {
    demoGeneration.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    audio.current?.performance.stop("demo:");
    setPlaying(false);
  }, []);

  const panic = useCallback(() => {
    lessonGeneration.current++;
    stopDemo();
    dispatchPractice({
      type: "playback",
      position: lessonPlayerRef.current.pause(performance.now()),
    });
    audio.current?.performance.stop();
    pointers.current.clear();
    setLatchedSustain(false);
    setSpaceSustain(false);
  }, [stopDemo]);

  useEffect(() => {
    const engine = new PianoAudio(setActiveNotes, setSampleState);
    audio.current = engine;
    void engine.prepare();
    const silenceWhenHidden = () => {
      if (document.hidden) panic();
    };
    window.addEventListener("blur", panic);
    document.addEventListener("visibilitychange", silenceWhenHidden);
    return () => {
      window.removeEventListener("blur", panic);
      document.removeEventListener("visibilitychange", silenceWhenHidden);
      timers.current.forEach(clearTimeout);
      if (midi.current) midi.current.onstatechange = null;
      attachedInputs.current.forEach((input) => {
        input.onmidimessage = null;
      });
      engine.dispose();
    };
  }, [panic]);

  useEffect(() => {
    audio.current?.setVolume(volume / 100);
    try {
      localStorage.setItem("still-volume", String(volume));
    } catch {
      /* Storage is optional. */
    }
  }, [volume]);
  useEffect(() => {
    audio.current?.setReverb(reverb);
  }, [reverb]);
  useEffect(() => {
    audio.current?.performance.sustain(sustain);
  }, [sustain]);
  useEffect(() => {
    const viewport = keyboardViewport.current;
    if (viewport)
      viewport.scrollLeft = Math.max(
        0,
        (viewport.scrollWidth - viewport.clientWidth) * 0.42,
      );
  }, []);

  const playNote = useCallback(
    (id: string, note: number, velocity = 0.75) => {
      stopDemo();
      void audio.current?.unlock().then((ok) => {
        if (!ok)
          setAudioMessage(
            "소리를 시작하지 못했어요. 브라우저의 오디오 설정을 확인해 주세요.",
          );
      });
      audio.current?.performance.noteOn(id, note, velocity);
    },
    [stopDemo],
  );

  const changeOctave = useCallback((delta: number) => {
    audio.current?.performance.stop("keyboard:");
    audio.current?.performance.stop("pointer:");
    pointers.current.clear();
    setOctave((value) => Math.max(2, Math.min(5, value + delta)));
  }, []);

  useEffect(() => {
    if (expectedNote === undefined) return;
    const nextOctave = keyboardOctaveFor(expectedNote, octave);
    if (nextOctave !== octave) setOctave(nextOctave);
    const viewport = keyboardViewport.current;
    const target = viewport?.querySelector<HTMLElement>(
      `[data-note="${expectedNote}"]`,
    );
    if (viewport && target) {
      const box = target.getBoundingClientRect();
      const area = viewport.getBoundingClientRect();
      if (box.left < area.left + 8 || box.right > area.right - 8)
        viewport.scrollLeft +=
          box.left + box.width / 2 - area.left - area.width / 2;
    }
  }, [expectedNote, octave]);

  const switchMode = (nextMode: "free" | "practice") => {
    panic();
    practiceEnabled.current = nextMode === "practice";
    setMode(nextMode);
  };

  const startLesson = async () => {
    panic();
    const generation = ++lessonGeneration.current;
    if (
      !(await audio.current?.unlock()) ||
      generation !== lessonGeneration.current
    )
      return;
    dispatchPractice({
      type: "playback",
      position: lessonPlayer.start(performance.now()),
    });
    keyboardViewport.current?.focus({ preventScroll: true });
    keyboardViewport.current
      ?.closest(".piano-studio")
      ?.scrollIntoView({ block: "center" });
  };

  useEffect(() => {
    lessonPlayer.setSpeed(practiceSpeed, performance.now());
    lessonPlayer.loop = practice.loop;
  }, [lessonPlayer, practiceSpeed, practice.loop]);

  useEffect(() => {
    if (practice.status === "ready") lessonPlayer.reset();
    if (practice.status !== "practicing") return;
    let frame = 0;
    let shown = lessonPlayer.position;
    const tick = (now: number) => {
      const position = lessonPlayer.tick(now);
      // The note layer paints every frame directly from the player. React only
      // needs to update the controls when the musical progress changes.
      if (
        position.cursor !== shown.cursor ||
        position.laps !== shown.laps ||
        position.status !== shown.status
      ) {
        shown = position;
        dispatchPractice({ type: "playback", position });
      }
      if (position.status === "practicing") frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [lessonPlayer, practice.status]);

  useEffect(
    () => () => {
      lessonPlayer.pause(performance.now());
    },
    [lessonPlayer],
  );

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        guide.current?.open ||
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (event.code === "Space") {
        if (target.closest("button, a")) return;
        event.preventDefault();
        setSpaceSustain(true);
        return;
      }
      if (event.code === "Escape") {
        panic();
        return;
      }
      if (event.code === "BracketLeft" || event.code === "BracketRight") {
        event.preventDefault();
        if (!event.repeat && !practiceEnabled.current)
          changeOctave(event.code === "BracketLeft" ? -1 : 1);
        return;
      }
      const note = keyboardNote(event.code, octave);
      if (note === null) return;
      event.preventDefault();
      if (!event.repeat) playNote(`keyboard:${event.code}`, note);
    };
    const up = (event: KeyboardEvent) => {
      // Release regardless of current focus, modifier keys, or octave.
      if (event.code === "Space") setSpaceSustain(false);
      audio.current?.performance.noteOff(`keyboard:${event.code}`);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [octave, playNote, panic, changeOctave]);

  const pointerNote = (event: ReactPointerEvent) => {
    const element = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-note]");
    return element ? Number(element.dataset.note) : null;
  };
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const note = pointerNote(event);
    if (note === null) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, note);
    playNote(`pointer:${event.pointerId}:${note}`, note);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const note = pointerNote(event);
    if (note === pointers.current.get(event.pointerId)) return;
    const previous = pointers.current.get(event.pointerId);
    audio.current?.performance.noteOff(
      `pointer:${event.pointerId}:${previous}`,
    );
    pointers.current.set(event.pointerId, note ?? -1);
    if (note !== null) playNote(`pointer:${event.pointerId}:${note}`, note);
  };
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const note = pointers.current.get(event.pointerId);
    audio.current?.performance.noteOff(`pointer:${event.pointerId}:${note}`);
    pointers.current.delete(event.pointerId);
  };

  const playDemo = async () => {
    if (playing) {
      stopDemo();
      return;
    }
    panic();
    const generation = ++demoGeneration.current;
    if (
      !(await audio.current?.unlock()) ||
      demoGeneration.current !== generation
    )
      return;
    setPlaying(true);
    DEMO.forEach(([time, note, duration], index) => {
      const id = `demo:${index}`;
      timers.current.push(
        setTimeout(
          () => audio.current?.performance.noteOn(id, note, 0.6, "demo"),
          time * 500,
        ),
      );
      timers.current.push(
        setTimeout(
          () => audio.current?.performance.noteOff(id),
          (time + duration) * 500,
        ),
      );
    });
    timers.current.push(setTimeout(stopDemo, 6500));
  };

  const connectMidi = async () => {
    const navigatorWithMidi = navigator;
    if (!window.isSecureContext) {
      setMidiMessage(
        "MIDI 연결에는 HTTPS 주소가 필요해요. 마우스와 키보드로는 바로 연주할 수 있어요.",
      );
      return;
    }
    if (!navigatorWithMidi.requestMIDIAccess) {
      setMidiMessage(
        "이 브라우저는 MIDI를 지원하지 않아요. 데스크톱 Chrome 또는 Edge에서 연결해 주세요.",
      );
      return;
    }
    setMidiBusy(true);
    try {
      await audio.current?.unlock();
      const access =
        midi.current ??
        (await navigatorWithMidi.requestMIDIAccess({ sysex: false }));
      midi.current = access;
      const syncInputs = () => {
        const connected = new Map(
          [...access.inputs].filter(([, input]) => input.state === "connected"),
        );
        for (const [id, input] of attachedInputs.current) {
          if (!connected.has(id)) {
            input.onmidimessage = null;
            audio.current?.performance.stop(`midi:${id}:`);
          }
        }
        connected.forEach((input) => {
          input.onmidimessage = (event) => {
            if (
              !audio.current ||
              !event.data ||
              document.hidden ||
              guide.current?.open
            )
              return;
            stopDemo();
            handleMidiMessage(event.data, input.id, audio.current.performance);
          };
        });
        attachedInputs.current = connected;
        const names = [...connected.values()].map(
          (input) => input.name || "MIDI 키보드",
        );
        setMidiNames(names);
        setMidiMessage(
          names.length
            ? `${names.join(", ")} 연결됨 · 건반과 서스테인 페달을 사용할 수 있어요.`
            : "연결된 기기가 없어요. MIDI 키보드를 USB로 연결하면 자동으로 인식해요.",
        );
      };
      access.onstatechange = syncInputs;
      syncInputs();
    } catch (error) {
      setMidiMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "MIDI 접근이 허용되지 않았어요. 브라우저의 사이트 권한에서 허용한 뒤 다시 연결해 주세요."
          : "MIDI를 연결하지 못했어요. 기기 연결 상태와 브라우저 권한을 확인해 주세요.",
      );
    } finally {
      setMidiBusy(false);
    }
  };

  const openGuide = () => {
    panic();
    guide.current?.showModal();
  };
  // Keep the score and physical key positions fixed while typing labels change octave.
  const firstNote =
    mode === "practice"
      ? Math.floor(Math.min(...allSongNotes.map((note) => note.midi)) / 12) * 12
      : octave * 12;
  const lastNote =
    mode === "practice"
      ? Math.ceil(
          (Math.max(...allSongNotes.map((note) => note.midi)) + 1) / 12,
        ) * 12
      : firstNote + 36;
  const keys = Array.from(
    { length: lastNote - firstNote + 1 },
    (_, i) => firstNote + i,
  );
  const whiteKeys = keys.filter((note) => !isBlack(note));
  const base = (octave + 1) * 12;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 45 ? Volume1 : Volume2;
  const soundStatus =
    sampleState === "loading"
      ? "피아노 음원을 준비하고 있어요"
      : sampleState === "fallback"
        ? "기본 음색 사용 중 · 음원을 불러오지 못했어요"
        : "이 브라우저는 오디오를 지원하지 않아요";

  const renderKey = (note: number) => {
    const black = isBlack(note);
    const mapped = KEY_CODES[note - base];
    const position = whiteKeys.filter((white) => white < note).length;
    return (
      <button
        key={note}
        type="button"
        data-note={note}
        aria-label={`${noteName(note)}${mapped ? `, 키보드 ${KEY_LABELS[note - base]}` : ""}`}
        aria-pressed={activeNotes.includes(note)}
        data-expected={expectedNote === note ? "true" : undefined}
        tabIndex={-1}
        className={`piano-key ${black ? "black-key" : "white-key"} ${activeNotes.includes(note) ? "pressed" : ""} ${expectedNote === note ? "expected-key" : ""} ${note === 60 ? "middle-c" : ""}`}
        style={
          black
            ? {
                left: `calc(${(position / whiteKeys.length) * 100}% - var(--black-width) / 2)`,
              }
            : undefined
        }
        onClick={(event) => {
          if (event.detail === 0) {
            playNote(`accessible:${note}`, note);
            timers.current.push(
              setTimeout(
                () => audio.current?.performance.noteOff(`accessible:${note}`),
                400,
              ),
            );
          }
        }}
      >
        <span className="key-label">
          {labels && mapped ? KEY_LABELS[note - base] : ""}
        </span>
        <span className="note-label">
          {!black && note % 12 === 0 ? noteName(note) : ""}
        </span>
        {note === 60 && <span className="middle-c-dot" />}
        {expectedNote === note && (
          <span className="expected-marker" aria-label="다음 연습 음">
            ●
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={`site-shell ${mode === "practice" ? "practice-mode" : ""}`}>
      <header className="site-header">
        <a className="home-link" href="#" aria-label="Still Online Piano 홈">
          <Brand />
        </a>
        <span className="header-tagline">언제든, 당신의 작은 음악실.</span>
        <button className="guide-button" onClick={openGuide}>
          <CircleHelp size={17} /> 사용 가이드 <ChevronRight size={14} />
        </button>
      </header>
      <main>
        <section className="intro" aria-labelledby="main-title">
          <div className="intro-copy">
            <p className="eyebrow">
              <span /> A LITTLE ROOM FOR YOUR MUSIC
            </p>
            <h1 id="main-title">
              오늘의 마음을,
              <br />
              <span>건반 위에.</span>
              <svg
                className="title-spark"
                viewBox="0 0 70 70"
                aria-hidden="true"
              >
                <path d="M34 7v18M34 43v18M7 34h18M43 34h18M15 15l12 12M43 43l12 12M15 55l12-12M43 27l12-12" />
              </svg>
            </h1>
          </div>
          <div className="intro-aside">
            <span className="aside-rule" />
            <p>
              잘 치지 않아도 괜찮아요.
              <br />
              잠시 쉬어 가듯, 떠오르는 음을 눌러 보세요.
            </p>
            <button
              className={`demo-button ${playing ? "is-playing" : ""}`}
              onClick={() => void playDemo()}
              disabled={sampleState === "unsupported"}
            >
              {playing ? (
                <Square size={12} fill="currentColor" />
              ) : (
                <Play size={13} fill="currentColor" />
              )}
              <span>{playing ? "미리 듣기 멈추기" : "먼저 들어볼까요?"}</span>
              <span className="demo-waves" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </button>
          </div>
        </section>

        <div className="mode-switch" role="group" aria-label="연주 모드">
          <button
            aria-pressed={mode === "free"}
            onClick={() => switchMode("free")}
          >
            자유 연주
          </button>
          <button
            aria-pressed={mode === "practice"}
            onClick={() => switchMode("practice")}
          >
            곡 연습 <span>NEW</span>
          </button>
        </div>
        {mode === "practice" && (
          <SongLibrary
            state={practice}
            dispatch={dispatchPractice}
            onStop={panic}
          />
        )}

        <section className="studio-section" aria-label="온라인 피아노">
          {sampleState !== "ready" && (
            <div className="studio-caption">
              <div
                className={`ready-status ${sampleState === "loading" ? "loading" : ""} ${sampleState === "fallback" || sampleState === "unsupported" ? "warning" : ""}`}
                role="status"
              >
                <span className="status-dot" />
                {soundStatus}
              </div>
            </div>
          )}
          <div className="piano-studio" data-sample-state={sampleState}>
            <div className="instrument-toolbar">
              <div className="instrument-name">
                <span className="instrument-icon">
                  <Piano size={24} strokeWidth={1.4} />
                </span>
                <div>
                  <h2>그랜드 피아노</h2>
                  <p>SALAMANDER GRAND</p>
                </div>
              </div>
              <div className="instrument-controls">
                <button
                  className={`control-toggle ${reverb ? "enabled" : ""}`}
                  aria-pressed={reverb}
                  onClick={() => setReverb(!reverb)}
                  title="공간의 울림을 더해요"
                >
                  <AudioLines size={17} />
                  <span>잔향</span>
                  <span className="mini-switch" />
                </button>
                <span className="toolbar-divider" />
                <div className="volume-control">
                  <VolumeIcon size={18} />
                  <input
                    type="range"
                    aria-label="볼륨"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                    style={{ "--volume": `${volume}%` } as React.CSSProperties}
                  />
                  <span className="volume-value">{volume}</span>
                </div>
                <span className="toolbar-divider" />
                <button
                  className={`midi-button ${midiNames.length ? "connected" : ""}`}
                  onClick={() => void connectMidi()}
                  disabled={midiBusy}
                >
                  {midiBusy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : midiNames.length ? (
                    <Check size={16} />
                  ) : (
                    <PlugZap size={16} />
                  )}
                  <span>{midiNames.length ? "MIDI 연결됨" : "MIDI 연결"}</span>
                  <span className="midi-dot" />
                </button>
              </div>
            </div>
            {mode === "practice" && (
              <div className="keyboard-lesson-hint">
                <span className="keyboard-lesson-title">{song.title}</span>
                <span
                  className="keyboard-lesson-target"
                  role="status"
                  aria-live={
                    practice.status === "practicing" ? "off" : "polite"
                  }
                >
                  {practice.status === "complete" ? (
                    "선율 재생이 끝났어요!"
                  ) : (
                    <>
                      {practice.status === "paused"
                        ? "일시정지 · 이어 칠 음"
                        : "따라 칠 음"}
                      <strong>
                        {expectedNote === undefined
                          ? "쉼"
                          : noteName(expectedNote)}
                      </strong>
                      <kbd>{KEY_LABELS[expectedNote! - base]}</kbd>
                    </>
                  )}
                </span>
              </div>
            )}
            <div className="piano-body">
              <div className="fallboard">
                <span>Still Online Piano</span>
                <div className="fallboard-center">
                  <span
                    className={`sound-bars ${activeNotes.length ? "active" : ""}`}
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <span className="fallboard-edition">THE EVERYDAY PIANO</span>
              </div>
              <div
                className="keyboard-viewport"
                ref={keyboardViewport}
                tabIndex={0}
                role="group"
                aria-label="피아노 건반. A부터 작은따옴표까지 연주, Space 서스테인, 대괄호로 옥타브 이동."
                onFocus={(event) => {
                  if (event.target === event.currentTarget)
                    void audio.current?.unlock();
                }}
              >
                <div
                  className={
                    mode === "practice" ? "practice-keyboard-track" : undefined
                  }
                >
                  {mode === "practice" && (
                    <FallingNotes
                      key={`${song.id}:${practice.section ?? "all"}`}
                      notes={notes}
                      keys={keys}
                      state={practice}
                      player={lessonPlayer}
                      activeNotes={activeNotes}
                    />
                  )}
                  <div
                    className="piano-keyboard"
                    style={
                      mode === "practice"
                        ? ({
                            "--black-width": `${(0.62 / whiteKeys.length) * 100}%`,
                          } as React.CSSProperties)
                        : undefined
                    }
                    onPointerDown={pointerDown}
                    onPointerMove={pointerMove}
                    onPointerUp={pointerUp}
                    onPointerCancel={pointerUp}
                    onLostPointerCapture={pointerUp}
                  >
                    {whiteKeys.map(renderKey)}
                    {keys.filter(isBlack).map(renderKey)}
                  </div>
                </div>
              </div>
              <div className="piano-front" />
            </div>
            {mode === "practice" && (
              <PracticeControls
                state={practice}
                dispatch={dispatchPractice}
                speed={practiceSpeed}
                disabled={sampleState === "unsupported"}
                onSpeed={setPracticeSpeed}
                onStart={() => void startLesson()}
                onStop={panic}
              />
            )}
            <div className="performance-toolbar">
              <div className="octave-control">
                <span>옥타브</span>
                <button
                  aria-label="옥타브 낮추기"
                  disabled={octave === 2 || mode === "practice"}
                  onClick={() => changeOctave(-1)}
                >
                  <ArrowLeft size={14} />
                </button>
                <span className="octave-value">
                  {octave - 4 > 0 ? "+" : ""}
                  {octave - 4}
                </span>
                <button
                  aria-label="옥타브 높이기"
                  disabled={octave === 5 || mode === "practice"}
                  onClick={() => changeOctave(1)}
                >
                  <ArrowRight size={14} />
                </button>
                <span className="octave-range">
                  {noteName(firstNote)} – {noteName(lastNote)}
                </span>
              </div>
              <button
                className={`sustain-control ${sustain ? "enabled" : ""}`}
                onClick={() => setLatchedSustain(!latchedSustain)}
                aria-pressed={sustain}
              >
                <span className="pedal-mark" />
                <span>서스테인</span>
                <kbd>space</kbd>
                <span className="sustain-light" />
              </button>
              <button
                className={`labels-control ${labels ? "enabled" : ""}`}
                aria-pressed={labels}
                onClick={() => setLabels(!labels)}
              >
                <Keyboard size={16} />
                <span>키보드 표시</span>
                <span className="mini-switch" />
              </button>
            </div>
          </div>
          {midiMessage && (
            <p className="feedback-message" role="status">
              <PlugZap size={16} />
              {midiMessage}
              <button
                aria-label="MIDI 안내 닫기"
                onClick={() => setMidiMessage("")}
              >
                <X size={14} />
              </button>
            </p>
          )}
          {audioMessage && (
            <p className="feedback-message" role="alert">
              {audioMessage}
            </p>
          )}
          <div className="mobile-scroll-hint">
            <button
              aria-label="낮은 건반 보기"
              onClick={() => keyboardViewport.current?.scrollBy({ left: -180 })}
            >
              <ArrowLeft size={13} />
            </button>
            <span>좌우 버튼으로 건반을 이동할 수 있어요</span>
            <button
              aria-label="높은 건반 보기"
              onClick={() => keyboardViewport.current?.scrollBy({ left: 180 })}
            >
              <ArrowRight size={13} />
            </button>
          </div>
        </section>

        <div className="closing-note">
          <Sparkles size={15} strokeWidth={1.3} />
          <span>틀린 음은 없어요. 당신의 음악이 있을 뿐.</span>
        </div>
      </main>
      <footer className="site-footer">
        <Brand small />
        {mode === "practice" && <SongSource songId={practice.songId} />}
      </footer>

      <dialog
        ref={guide}
        className="guide-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) guide.current?.close();
        }}
        aria-labelledby="guide-title"
      >
        <div className="guide-content">
          <button
            className="dialog-close"
            aria-label="사용 가이드 닫기"
            onClick={() => guide.current?.close()}
          >
            <X size={20} />
          </button>
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h2 id="guide-title">당신의 첫 음을 위해.</h2>
          <p className="guide-intro">
            아는 곡이 없어도 괜찮아요. 편한 방법으로 시작하세요.
          </p>
          <section>
            <h3>
              <MousePointer2 size={18} /> 마우스와 터치
            </h3>
            <p>
              건반을 누르고 있으면 음이 이어집니다. 누른 채 옆으로 움직이면 다른
              음을 연주할 수 있고, 터치 기기에서는 여러 손가락으로 화음을 만들
              수 있어요.
            </p>
          </section>
          <section>
            <h3>
              <Keyboard size={18} /> 컴퓨터 키보드
            </h3>
            <div className="guide-keys">
              {KEY_LABELS.slice(0, 13).map((label, i) => (
                <span
                  key={label}
                  className={isBlack(60 + i) ? "guide-key-black" : ""}
                >
                  <kbd>{label}</kbd>
                  <small>{noteName(60 + i)}</small>
                </span>
              ))}
            </div>
            <p>
              한글 입력 상태에서도 같은 위치의 키로 연주할 수 있어요.{" "}
              <kbd>[</kbd> <kbd>]</kbd> 로 음역을 이동하고, <kbd>Space</kbd> 를
              누르는 동안 서스테인이 유지됩니다. 서스테인 버튼은 페달을
              고정하고, <kbd>Esc</kbd> 는 모든 소리를 멈춥니다.
            </p>
            <p className="guide-note">
              일반 키보드는 동시에 인식할 수 있는 키 수가 제한될 수 있어요. 많은
              음을 함께 연주하려면 MIDI 기기를 사용해 보세요.
            </p>
          </section>
          <section>
            <h3>
              <PlugZap size={18} /> MIDI 기기
            </h3>
            <p>
              USB로 MIDI 키보드를 연결하고 ‘MIDI 연결’을 눌러 브라우저 접근을
              허용해 주세요. 데스크톱 Chrome·Edge 등 Web MIDI 지원 브라우저와
              HTTPS 접속이 필요해요. 88건반 음역, 연주 세기, 서스테인 페달을
              지원합니다.
            </p>
          </section>
          <section>
            <h3>
              <Piano size={18} /> 곡 연습
            </h3>
            <p>
              ‘곡 연습’에서 곡과 구간을 선택하고 연습을 시작하세요. 위에서
              내려오는 막대가 건반 위 선에 닿으면 해당 건반을 누르세요. 음악은
              입력과 관계없이 자동으로 재생됩니다. 키보드·터치·MIDI로 따라 칠 수
              있어요.
            </p>
            <p>
              수록곡은 주요 선율의 단선율 발췌입니다. 연주를 채점하지 않으며,
              진행 속도와 구간 반복을 조절해 연습할 수 있어요. 창을 벗어나거나
              가이드를 열면 일시정지합니다.
            </p>
          </section>
          <section className="credits">
            <h3>작은 음악실, 열린 음악.</h3>
            <p>
              연주와 음원 재생은 브라우저 안에서 처리합니다. 볼륨 설정은 이
              기기에 저장해요.
            </p>
            <p>
              피아노 음원:{" "}
              <a
                href="https://github.com/Tonejs/audio/tree/master/salamander"
                target="_blank"
                rel="noreferrer"
              >
                Salamander Grand Piano
              </a>{" "}
              by Alexander Holm ·{" "}
              <a
                href="https://creativecommons.org/licenses/by/3.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 3.0
              </a>
              . Tone.js 배포 MP3 샘플을 사용하며 재생 속도와 볼륨, 잔향을 실시간
              조절합니다.
            </p>
          </section>
          <button
            className="start-playing"
            onClick={() => {
              guide.current?.close();
              keyboardViewport.current?.focus();
            }}
          >
            이제, 연주해 볼까요 <ArrowRight size={16} />
          </button>
        </div>
      </dialog>
    </div>
  );
}
