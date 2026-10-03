import { Performance } from "./music";

type Voice = { source: AudioBufferSourceNode | OscillatorNode; gain: GainNode };
export type SampleState = "loading" | "ready" | "fallback" | "unsupported";
const SAMPLE_NOTES = [21, ...Array.from({ length: 29 }, (_, i) => 24 + i * 3)];
const SAMPLE_NAMES = [
  "C",
  "Cs",
  "D",
  "Ds",
  "E",
  "F",
  "Fs",
  "G",
  "Gs",
  "A",
  "As",
  "B",
];

export class PianoAudio {
  readonly performance: Performance;
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private wet: GainNode | null = null;
  private voices = new Map<string, Voice>();
  private samples = new Map<number, AudioBuffer>();
  private abort = new AbortController();
  private volume = 0.7;
  private reverb = true;
  private disposed = false;

  constructor(
    changed: (notes: number[]) => void,
    private state: (state: SampleState) => void,
  ) {
    this.performance = new Performance(
      this.attack.bind(this),
      this.release.bind(this),
      changed,
    );
  }

  async prepare() {
    if (!("AudioContext" in window)) {
      this.state("unsupported");
      return;
    }
    try {
      const context = this.getContext();
      await Promise.all(
        SAMPLE_NOTES.map(async (note) => {
          const name = `${SAMPLE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
          const response = await fetch(
            `${import.meta.env.BASE_URL}audio/${name}.mp3`,
            { signal: this.abort.signal },
          );
          if (!response.ok) throw new Error(`Sample unavailable: ${name}`);
          const buffer = await context.decodeAudioData(
            await response.arrayBuffer(),
          );
          if (!this.disposed) this.samples.set(note, buffer);
        }),
      );
      if (!this.disposed) this.state("ready");
    } catch {
      if (!this.disposed) this.state(this.context ? "fallback" : "unsupported");
    }
  }

  // Called directly in a gesture handler, before any asynchronous work.
  async unlock() {
    try {
      const context = this.getContext();
      if (context.state !== "running") await context.resume();
      return context.state === "running";
    } catch {
      this.state("unsupported");
      return false;
    }
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.context && this.output)
      this.output.gain.setTargetAtTime(
        volume * 0.8,
        this.context.currentTime,
        0.02,
      );
  }

  setReverb(enabled: boolean) {
    this.reverb = enabled;
    if (this.context && this.wet)
      this.wet.gain.setTargetAtTime(
        enabled ? 0.2 : 0,
        this.context.currentTime,
        0.03,
      );
  }

  private getContext() {
    if (this.context) return this.context;
    const context = new AudioContext({ latencyHint: "interactive" });
    this.context = context;
    const output = context.createGain();
    output.gain.value = this.volume * 0.8;
    this.output = output;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.2;
    output.connect(compressor);
    compressor.connect(context.destination);
    const impulse = context.createBuffer(
      2,
      context.sampleRate * 1.6,
      context.sampleRate,
    );
    for (let channel = 0; channel < 2; channel++) {
      const values = impulse.getChannelData(channel);
      for (let i = 0; i < values.length; i++)
        values[i] =
          (Math.random() * 2 - 1) * Math.pow(1 - i / values.length, 3);
    }
    const convolver = context.createConvolver();
    convolver.buffer = impulse;
    const wet = context.createGain();
    wet.gain.value = this.reverb ? 0.2 : 0;
    this.wet = wet;
    wet.connect(convolver);
    convolver.connect(output);
    return context;
  }

  private attack(id: string, note: number, velocity: number) {
    if (this.disposed || !this.context || !this.output) return;
    const context = this.context;
    const now = context.currentTime;
    // Keep unusually dense MIDI streams bounded; oldest voices are stolen first.
    if (this.voices.size >= 96) this.release(this.voices.keys().next().value!);
    let source: AudioBufferSourceNode | OscillatorNode;
    const nearest = [...this.samples.keys()].sort(
      (a, b) => Math.abs(a - note) - Math.abs(b - note),
    )[0];
    const sampled = nearest !== undefined;
    if (sampled) {
      const sample = context.createBufferSource();
      sample.buffer = this.samples.get(nearest)!;
      sample.playbackRate.value = 2 ** ((note - nearest) / 12);
      source = sample;
    } else {
      const oscillator = context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
      source = oscillator;
    }
    const gain = context.createGain();
    const level = velocity ** 1.5 * (sampled ? 1 : 0.22);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.006);
    if (!sampled) gain.gain.setTargetAtTime(0.0001, now + 0.1, 1.3);
    source.connect(gain);
    gain.connect(this.output);
    gain.connect(this.wet!);
    const voice = { source, gain };
    this.voices.set(id, voice);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (this.voices.get(id) === voice) this.voices.delete(id);
    };
    source.start(now);
    // Oscillator fallbacks must end even if a pedal is held indefinitely.
    if (!sampled) source.stop(now + 12);
  }

  private release(id: string) {
    const voice = this.voices.get(id);
    if (!voice || !this.context) return;
    this.voices.delete(id);
    const now = this.context.currentTime;
    if (typeof voice.gain.gain.cancelAndHoldAtTime === "function") {
      voice.gain.gain.cancelAndHoldAtTime(now);
    } else {
      // Firefox versions without cancelAndHoldAtTime still need a clean release.
      const level = voice.gain.gain.value;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(level, now);
    }
    voice.gain.gain.setTargetAtTime(0, now, 0.07);
    voice.source.stop(now + 0.4);
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    this.performance.stop();
    void this.context?.close();
  }
}
