# Still Online Piano

마우스, 키보드, MIDI 기기로 연주하는 온라인 피아노입니다. React, TypeScript, Vite, Web Audio API로 만들었으며 현재 버전은 별도의 백엔드·데이터베이스·API 키가 필요하지 않습니다.

## 시작하기

내 컴퓨터에서 직접 사용해 보려면 [로컬 실행 안내](LOCAL-RUN.md)를 참고하세요. Windows용 `start-local.cmd`와 macOS용 `start-local.command`가 최초 설치와 브라우저 실행을 처리합니다. `npm run dev:local`로도 같은 실행기를 사용할 수 있습니다.

Node.js 24 LTS와 npm을 권장합니다.

```sh
npm ci
npm run dev
```

Vite가 출력하는 개발 서버 주소에서 실행합니다. 개발 서버의 기본 포트는 5173입니다.

```sh
npm run build       # TypeScript 검사 및 dist/ 생성
npm run preview     # 완성된 정적 빌드 확인
npm test            # 입력 소유권, 서스테인, MIDI 프로토콜 단위 테스트
npm run test:browser # Chromium에서 UI·오디오·터치·가상 MIDI 검증
```

클라우드 환경에는 Chromium이 설치되어 있습니다. 다른 환경에서 브라우저 테스트를 실행하려면 `npx playwright install chromium`으로 설치하거나 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`에 기존 Chromium 경로를 지정합니다. 브라우저 테스트는 실행 중인 5173 포트의 개발 서버를 사용하거나 직접 서버를 시작합니다.

## 연주하기

- 마우스나 터치로 건반을 누릅니다. 누른 채 이동하면 다른 음으로 이어지고, 멀티터치 화음도 지원합니다.
- 물리 키 위치 `A W S E D F T G Y H U J K O L P ; '`가 기본 C4–F5에 대응합니다. 한글 입력 상태에서도 위치가 같습니다.
- `[` / `]` 또는 화살표 버튼으로 컴퓨터 키보드의 음역을 이동합니다.
- `Space`를 누르는 동안 서스테인이 유지됩니다. 화면의 서스테인 버튼으로 고정할 수도 있습니다.
- `Esc`로 모든 음과 페달을 해제합니다. 다른 창으로 전환하거나 사용 가이드를 열어도 소리가 해제됩니다.
- MIDI 연결 버튼은 브라우저 권한을 요청하고 연결된 모든 MIDI 입력을 사용합니다. A0–C8의 88건반 음역, 연주 세기, 채널별 서스테인(CC64), all notes/sound off(CC123/120)를 지원합니다. 기기의 분리·재연결도 자동 감지합니다.
- MIDI는 Web MIDI 지원 브라우저(데스크톱 Chrome·Edge 등)와 보안 컨텍스트(배포 시 HTTPS)가 필요합니다. 개발 시 loopback 주소도 지원됩니다. MIDI가 없어도 마우스와 컴퓨터 키보드로 연주할 수 있습니다.

피아노는 실제 Salamander 샘플 30개를 불러온 뒤 재생 속도를 조절해 모든 음정을 만듭니다. MIDI 세기는 볼륨에 반영되며 여러 녹음 세기를 전환하는 방식은 아닙니다. 음원을 불러오지 못하면 화면에 안내하고 기본 합성 음색으로 연주를 유지합니다. 사용자가 AKAI MPK mini Professional과 컴퓨터를 연결하여 실제 연주를 확인했습니다. 다른 MIDI 기기 및 모바일 Safari 실기기 검증은 별도로 필요합니다.

## 곡 연습

‘곡 연습’에서 **엘리제를 위하여** 또는 **짐노페디 1번**의 주요 선율을 따라 칠 수 있습니다. 모두 **단선율 발췌**이며 원곡 전체·양손 악보를 제공하는 기능은 아닙니다.

- 곡과 연습 구간을 선택하고 ‘연습 시작’을 누릅니다. 음표 막대가 위에서 내려와 해당 건반에 닿습니다. 긴 막대는 긴 음을 나타냅니다. 음악과 음표는 정해진 박자대로 자동 진행하며, 건반을 누르지 않거나 다른 음을 눌러도 멈추지 않습니다.
- 화면의 음표와 건반은 같은 가로 위치에 고정됩니다. 모바일에서 가로로 이동해도 함께 움직이고, 컴퓨터 키보드의 옥타브 전환은 화면 속 음표 위치에 영향을 주지 않습니다.
- 키보드·마우스·터치·MIDI를 지원합니다. 컴퓨터 키보드 음역은 다음 음에 맞춰 자동 이동합니다.
- 발췌 전체 또는 짧은 구간을 연습하고, 구간 반복·일시정지·처음부터 다시 시작할 수 있습니다.
- 진행 속도는 0.5·0.75·1·1.25배를 지원하며 자동 재생음과 음표 이동에 함께 적용됩니다. 재생 중 속도를 바꿔도 위치는 유지됩니다. 시작과 반복 시에는 2박의 준비 시간이 있습니다.
- 키보드·터치·MIDI로 자동 재생음에 맞춰 자유롭게 따라 칠 수 있습니다. 연주를 채점하지 않으며, 진행 표시는 재생 위치를 나타냅니다. 마지막 음의 길이와 쉼이 끝나면 재생이 완료됩니다.
- ‘움직임 줄이기’를 설정한 기기에서는 연속 이동 대신 단계별 위치를 표시하며 음악은 계속 재생됩니다.
- 창 전환·사용 가이드 열기는 연습과 재생을 멈춥니다. ‘이어서 연습’으로 같은 위치에서 재개합니다. 재생 위치는 새로고침하면 초기화됩니다.

원곡과 사용한 악보 판본 모두 퍼블릭 도메인으로 확인된 자료만 등록했습니다. 곡별 출처, 정확한 판본, 원문 해시, 발췌 범위와 등록 기준은 [연습곡 출처](SONG-SOURCES.md)에 기록했습니다. 원문은 `public/scores/`, 음표 데이터는 `src/songs.ts`에 있습니다. 곡 연습 화면에서도 출처와 원문을 확인할 수 있습니다.

## 호스팅

GitHub Pages용 자동 테스트·배포 워크플로를 포함했습니다. 처음 배포하는 방법은 [GitHub Pages 배포 안내](DEPLOY.md)를 참고하세요. Pages를 활성화한 뒤에는 `main`에 코드를 올릴 때마다 테스트·빌드·배포를 실행합니다.

다른 호스팅을 사용하려면 `npm run build` 결과인 **`dist/` 전체**를 HTTPS를 지원하는 정적 호스팅에 올리면 됩니다. 일반적인 설정은 다음과 같습니다.

| 설정                        | 값              |
| --------------------------- | --------------- |
| 설치 명령                   | `npm ci`        |
| 빌드 명령                   | `npm run build` |
| 배포 디렉터리               | `dist`          |
| Node.js                     | 24 LTS          |
| 환경 변수·서버·데이터베이스 | 필요 없음       |

하위 경로로 배포한다면 `npm run build -- --base=/StillOnlinePiano/`처럼 base를 지정합니다. GitHub Pages 워크플로는 저장소 이름을 기준으로 이 경로를 지정합니다. 오디오와 글꼴은 빌드에 포함되어 같은 호스트에서 제공됩니다. 사이트는 분석 도구나 외부 음원·글꼴 요청 없이 실행되며, 연주 정보를 서버로 전송하지 않습니다. 볼륨 값만 사용자의 브라우저 localStorage에 저장합니다. 실제 공개 상태와 주소는 GitHub Actions의 배포 결과에서 확인합니다.

## 주요 파일

- `src/App.tsx`: 화면, 컴퓨터 키보드·포인터·MIDI 연결
- `src/audio.ts`: 오디오 그래프, 샘플 로딩, 보이스 재생·해제
- `src/music.ts`: 독립 입력과 채널별 페달 상태, MIDI 메시지 처리
- `src/FallingNotes.tsx`, `src/pianoRoll.ts`, `src/lessonPlayer.ts`: 건반과 정렬되는 음표 표시, 자동 재생과 진행 위치의 공통 시간축
- `src/styles.css`: 반응형 화면과 건반
- `public/audio/`: 실제 피아노 MP3와 원본 라이선스
- `tests/piano.spec.ts`: 브라우저에서 실제 오디오 출력, 화음, 터치 및 가상 MIDI 확인
- `.github/workflows/site.yml`: GitHub Actions 테스트·빌드·Pages 배포
- `DEPLOY.md`: 최초 Pages 설정과 이후 업데이트 방법

## 음원·글꼴 출처

Salamander Grand Piano by **Alexander Holm**, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
Tone.js의 [audio 저장소](https://github.com/Tonejs/audio/tree/efd8296360f9526e379bfbe5c1698ff54d6a1d34/salamander)에 있는 MP3 파일을 수정 없이 포함했습니다. 재생 시 피치, 볼륨, 잔향을 조절합니다. 원본 안내문은 `public/audio/SALAMANDER-LICENSE.txt`에 있으며 사이트의 사용 가이드에도 크레딧을 표시합니다.

DM Sans와 Noto Serif KR은 Fontsource 패키지에서 제공하는 SIL Open Font License 글꼴입니다. 라이선스는 `public/licenses/`에 포함되어 있습니다.
