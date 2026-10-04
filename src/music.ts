export const NOTE_NAMES = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
];
export const KEY_CODES = [
  "KeyA",
  "KeyW",
  "KeyS",
  "KeyE",
  "KeyD",
  "KeyF",
  "KeyT",
  "KeyG",
  "KeyY",
  "KeyH",
  "KeyU",
  "KeyJ",
  "KeyK",
  "KeyO",
  "KeyL",
  "KeyP",
  "Semicolon",
  "Quote",
];
export const KEY_LABELS = [
  "A",
  "W",
  "S",
  "E",
  "D",
  "F",
  "T",
  "G",
  "Y",
  "H",
  "U",
  "J",
  "K",
  "O",
  "L",
  "P",
  ";",
  "'",
];
export const noteName = (note: number) =>
  `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
export const isBlack = (note: number) => [1, 3, 6, 8, 10].includes(note % 12);
export const keyboardNote = (code: string, octave: number) => {
  const index = KEY_CODES.indexOf(code);
  return index < 0 ? null : (octave + 1) * 12 + index;
};

type HeldNote = { note: number; scope: string; held: boolean };

// Ownership is per input, so releasing a mouse or MIDI note cannot cut off
// another input playing the same pitch. Pedals are scoped to their instrument.
export class Performance {
  private notes = new Map<string, HeldNote>();
  private pedals = new Set<string>();
  constructor(
    private attack: (id: string, note: number, velocity: number) => void,
    private release: (id: string) => void,
    private changed: (notes: number[]) => void = () => {},
    private played: (note: number, scope: string) => void = () => {},
  ) {}

  noteOn(id: string, note: number, velocity = 0.75, scope = "manual") {
    if (velocity <= 0) {
      this.noteOff(id);
      return;
    }
    if (this.notes.has(id)) this.release(id);
    this.notes.set(id, { note, scope, held: true });
    this.attack(id, note, Math.min(1, Math.max(0, velocity)));
    this.notify();
    this.played(note, scope);
  }

  noteOff(id: string) {
    const entry = this.notes.get(id);
    if (!entry) return;
    if (this.pedals.has(entry.scope)) entry.held = false;
    else {
      this.release(id);
      this.notes.delete(id);
    }
    this.notify();
  }

  sustain(down: boolean, scope = "manual") {
    if (down) this.pedals.add(scope);
    else {
      this.pedals.delete(scope);
      for (const [id, entry] of this.notes) {
        if (entry.scope === scope && !entry.held) {
          this.release(id);
          this.notes.delete(id);
        }
      }
    }
    this.notify();
  }

  stop(prefix = "") {
    for (const id of this.notes.keys()) {
      if (id.startsWith(prefix)) {
        this.release(id);
        this.notes.delete(id);
      }
    }
    for (const scope of this.pedals)
      if (scope.startsWith(prefix)) this.pedals.delete(scope);
    this.notify();
  }

  private notify() {
    this.changed(
      [
        ...new Set(
          [...this.notes.values()].filter((n) => n.held).map((n) => n.note),
        ),
      ].sort((a, b) => a - b),
    );
  }
}

export function handleMidiMessage(
  data: ArrayLike<number>,
  deviceId: string,
  performance: Performance,
) {
  if (data.length < 3) return;
  const [status, note, value] = [data[0], data[1], data[2]];
  const command = status & 0xf0;
  const scope = `midi:${deviceId}:${status & 0x0f}:`;
  const id = `${scope}${note}`;
  if (command === 0x90 && value > 0 && note >= 21 && note <= 108)
    performance.noteOn(id, note, value / 127, scope);
  else if (command === 0x80 || (command === 0x90 && value === 0))
    performance.noteOff(id);
  else if (command === 0xb0 && note === 64)
    performance.sustain(value >= 64, scope);
  else if (command === 0xb0 && [120, 123].includes(note))
    performance.stop(scope);
  else if (command === 0xb0 && note === 121) performance.sustain(false, scope);
}
