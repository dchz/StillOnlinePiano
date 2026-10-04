export type LessonNote = {
  midi: number;
  /** Quarter-note beats for playback and the piano roll, not timing assessment. */
  beats: number;
  gapAfter?: number;
};

export type Song = {
  id: string;
  title: string;
  originalTitle: string;
  composer: string;
  years: string;
  description: string;
  excerpt: string;
  bpm: number;
  sections: { title: string; notes: LessonNote[] }[];
  source: {
    url: string;
    file: string;
    typesetter: string;
    edition: string;
    publicationYear: number;
    composerDeathYear: number;
    license: "Public Domain";
    changes: string;
  };
};

const n = (midi: number, beats = 0.25, gapAfter = 0): LessonNote => ({
  midi,
  beats,
  gapAfter,
});

// Transcribed from the exact public-domain LilyPond editions in public/scores/.
// See SONG-SOURCES.md for provenance, review scope and transcription decisions.
export const SONGS: Song[] = [
  {
    id: "fur-elise",
    title: "엘리제를 위하여",
    originalTitle: "Für Elise · WoO 59",
    composer: "루트비히 판 베토벤",
    years: "1770–1827",
    description: "익숙한 첫 음부터, 한 음씩 천천히.",
    excerpt: "도입부 첫 반복 구간 · 오른손 단선율 발췌",
    bpm: 72,
    sections: [
      {
        title: "1. 익숙한 첫 선율",
        notes: [
          n(76),
          n(75),
          n(76),
          n(75),
          n(76),
          n(71),
          n(74),
          n(72),
          n(69, 0.5, 0.25),
        ],
      },
      {
        title: "2. 차근차근 올라가기",
        notes: [
          n(60),
          n(64),
          n(69),
          n(71, 0.5, 0.25),
          n(64),
          n(68),
          n(71),
          n(72, 0.5, 0.25),
        ],
      },
      {
        title: "3. 다시 만나는 선율",
        notes: [
          n(64),
          n(76),
          n(75),
          n(76),
          n(75),
          n(76),
          n(71),
          n(74),
          n(72),
          n(69, 0.5, 0.25),
        ],
      },
      {
        title: "4. 부드럽게 마무리",
        notes: [
          n(60),
          n(64),
          n(69),
          n(71, 0.5, 0.25),
          n(64),
          n(72),
          n(71),
          n(69, 1),
        ],
      },
    ],
    source: {
      url: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931",
      file: "fur_Elise_WoO59.ly",
      typesetter: "Stelios Samelis",
      edition: "Breitkopf & Härtel, 1888 · Mutopia 2015/08/18-931",
      publicationYear: 1867,
      composerDeathYear: 1827,
      license: "Public Domain",
      changes:
        "오른손 첫 반복 구간을 한 번만 연주합니다. 왼손 반주·페달·셈여림은 생략했습니다. 원래 음높이와 음 길이, 쉼표를 유지했습니다.",
    },
  },
  {
    id: "gymnopedie-1",
    title: "짐노페디 1번",
    originalTitle: "Gymnopédie No. 1",
    composer: "에릭 사티",
    years: "1866–1925",
    description: "여백을 느끼며, 잔잔하게 이어지는 멜로디.",
    excerpt: "5–21마디 · 위 성부 단선율 발췌",
    bpm: 72,
    sections: [
      {
        title: "1. 첫 번째 문장 · 5–12마디",
        notes: [
          n(78, 1),
          n(81, 1),
          n(79, 1),
          n(78, 1),
          n(73, 1),
          n(71, 1),
          n(73, 1),
          n(74, 1),
          n(69, 3),
          n(66, 12, 1),
        ],
      },
      {
        title: "2. 두 번째 문장 · 13–21마디",
        notes: [
          n(78, 1),
          n(81, 1),
          n(79, 1),
          n(78, 1),
          n(73, 1),
          n(71, 1),
          n(73, 1),
          n(74, 1),
          n(69, 3),
          n(73, 3),
          n(78, 3),
          n(64, 9),
        ],
      },
    ],
    source: {
      url: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=37",
      file: "gymnopedie_1.ly",
      typesetter: "Evin Robertson",
      edition: "원판 복각 Dover Edition 기반 · Mutopia 2014/12/14-37",
      publicationYear: 1888,
      composerDeathYear: 1925,
      license: "Public Domain",
      changes:
        "반주와 도입부 쉼을 생략하고 5마디의 첫 선율부터 시작합니다. 원래 음높이와 음 길이를 유지하고 붙임줄은 하나의 긴 음으로 합쳤습니다. Dover판의 번역문은 사용하지 않았습니다.",
    },
  },
];

export function lessonNotes(song: Song, section: number | null) {
  return section === null
    ? song.sections.flatMap((part) => part.notes)
    : song.sections[section].notes;
}

export function keyboardOctaveFor(note: number, current: number) {
  const base = (current + 1) * 12;
  return note >= base && note < base + 18
    ? current
    : Math.max(2, Math.min(5, Math.floor(note / 12) - 1));
}
