import { buildTimeline, ROLL_LEAD_BEATS } from "./pianoRoll";
import type { LessonNote } from "./songs";

export type PlaybackPosition = {
  beat: number;
  cursor: number;
  laps: number;
  status: "ready" | "practicing" | "paused" | "complete";
};
type Output = {
  noteOn: (id: string, midi: number) => void;
  stop: (id: string) => void;
};

/** One elapsed-time clock drives the score, automatic audio and progress.
 * Manual piano inputs own separate voices and never advance this clock. */
export class LessonPlayer {
  readonly timeline;
  position: PlaybackPosition = {
    beat: -ROLL_LEAD_BEATS,
    cursor: 0,
    laps: 0,
    status: "ready",
  };
  loop = false;
  private speed = 1;
  private lastTime = 0;
  private voice: string | null = null;

  constructor(
    notes: LessonNote[],
    private bpm: number,
    private output: Output,
  ) {
    this.timeline = buildTimeline(notes);
  }
  reset() {
    this.silence();
    this.position = {
      beat: -ROLL_LEAD_BEATS,
      cursor: 0,
      laps: 0,
      status: "ready",
    };
  }
  start(now: number) {
    if (this.position.status === "complete") this.reset();
    this.lastTime = now;
    this.position = { ...this.position, status: "practicing" };
    return this.tick(now);
  }
  pause(now: number) {
    if (this.position.status === "practicing") {
      this.tick(now);
      if (this.position.status === "practicing")
        this.position = { ...this.position, status: "paused" };
    }
    this.silence();
    return this.position;
  }
  setSpeed(speed: number, now: number) {
    this.tick(now);
    this.speed = speed;
  }
  tick(now: number): PlaybackPosition {
    if (this.position.status !== "practicing") return this.position;
    let beat =
      this.position.beat +
      ((Math.max(0, now - this.lastTime) / 1000) * this.bpm * this.speed) / 60;
    this.lastTime = Math.max(this.lastTime, now);
    let laps = this.position.laps;
    const { entries, duration } = this.timeline;
    if (beat >= duration) {
      this.silence();
      if (!this.loop) {
        this.position = {
          beat: duration,
          cursor: entries.length,
          laps: laps + 1,
          status: "complete",
        };
        return this.position;
      }
      const span = duration + ROLL_LEAD_BEATS;
      const passes = Math.floor((beat + ROLL_LEAD_BEATS) / span);
      laps += passes;
      beat -= passes * span;
    }
    // A delayed frame skips expired notes instead of playing a burst of old notes.
    const cursor = entries.findIndex((entry) => entry.end > beat);
    const entry = entries[cursor];
    const sounding =
      entry && beat >= entry.start && beat < entry.start + entry.beats * 0.92;
    const voice = sounding ? `lesson:${laps}:${cursor}` : null;
    if (voice !== this.voice) {
      this.silence();
      if (voice && entry) this.output.noteOn(voice, entry.midi);
      this.voice = voice;
    }
    this.position = {
      beat,
      cursor: cursor < 0 ? entries.length : cursor,
      laps,
      status: "practicing",
    };
    return this.position;
  }
  private silence() {
    if (this.voice) this.output.stop(this.voice);
    this.voice = null;
  }
}
