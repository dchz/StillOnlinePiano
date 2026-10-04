# 연습곡 출처와 등록 기준

검토일: **2026-10-04**. 첫 버전은 원곡 전체가 아니라 **주요 선율의 단선율 발췌**입니다. 실제 연주 녹음, 상업용 MIDI, 현대 편곡 악보를 가져오지 않았습니다. 미리 듣기는 아래 악보에서 옮긴 음표를 기존 피아노 음원으로 재생합니다.

## 등록 기준

- 원곡의 작곡가·사망 연도·출판 연도를 확인합니다. 현재 두 곡은 대한민국, 미국, EU의 일반 보호기간 기준에서 원곡 보호기간이 만료된 곡입니다. 이는 모든 국가·모든 판본에 대한 일괄적인 보증을 뜻하지 않습니다.
- 원곡과 별도로 **실제로 사용하는 악보·데이터 판본**의 이용 조건을 확인합니다. 현재 목록은 Mutopia 원문에 `license = "Public Domain"`이 명시된 판본만 사용합니다. 동일 작품의 다른 판본에는 이 판단을 적용하지 않습니다.
- 출처 URL, 정확한 버전, 원문 파일, 사보자, 발췌 범위, 변경 사항을 함께 기록합니다. 출처나 권리 조건이 불분명한 곡은 목록에 추가하지 않습니다.
- 원곡의 보호기간이 끝났더라도 새 편곡·번역·연주 녹음의 권리는 별개입니다. 비상업적 이용만 허용하는 자료는 향후 수익화 용도로 채택하지 않습니다.
- 피아노 **샘플 음원**은 악곡과 별개로 기존의 Alexander Holm / Salamander Grand Piano, CC BY 3.0을 사용합니다. 기존 출처·라이선스 표기를 유지합니다.

원곡 연혁은 [IMSLP의 Für Elise](https://imslp.org/wiki/F%C3%BCr_Elise,_WoO_59_(Beethoven,_Ludwig_van)) 및 [3 Gymnopédies](https://imslp.org/wiki/3_Gymnop%C3%A9dies_(Satie,_Erik))와 대조했습니다. 악보 데이터의 이용 표시는 아래 **Mutopia의 해당 버전 원문**을 기준으로 합니다. IMSLP에 올라온 별도 사보판이나 녹음을 재사용하지 않았습니다.

## 공통 원문 버전

저장소: [MutopiaProject/MutopiaProject](https://github.com/MutopiaProject/MutopiaProject)

확인한 커밋: `2144afd6f52d56c5b6995b8b589ef1268b3139f0`.

`public/scores/`에는 해당 커밋의 LilyPond 원문을 변경 없이 보관했습니다. 작성자·출처·Public Domain 선언이 포함됩니다. 프로그램은 `src/songs.ts`에 수동 전사한 연습 데이터를 사용하며, 외부 악보 서버에 의존하지 않습니다.

## 엘리제를 위하여 — Für Elise, WoO 59

- 작곡: Ludwig van Beethoven (1770–1827), 1810년. 최초 출판: 1867년.
- 사보: **Stelios Samelis**.
- 사용 판본: **Breitkopf & Härtel, 1888**, Mutopia `2015/08/18-931`.
- [Mutopia 작품·이용 조건](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931)
- [고정된 원문](https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/BeethovenLv/WoO59/fur_Elise_WoO59/fur_Elise_WoO59.ly)
- 보관 파일: `public/scores/fur_Elise_WoO59.ly`
- SHA-256: `828a7bd1b42e441fe1b0eb0389ba46f1502dab28bbe488389e635fb446ba7a67`
- 원문 이용 표시: **Public Domain**, 사보자가 퍼블릭 도메인으로 공개.
- 발췌: 위 보표의 첫 `repeat volta 2` 및 첫 번째 ending, **35개의 음**. 못갖춘마디의 E5–D♯5에서 첫 번째 A4 종지까지 한 번 연주합니다.
- 변경: 반복·왼손·페달·셈여림 생략. 음높이와 음 길이, 오른손 쉼표는 유지. 네 연습 구간으로 나눴습니다. 반주 없이도 저음 C4/E4의 오른손 연결음을 포함합니다.
- 확인용 시작 음: E5 D♯5 E5 D♯5 E5 B4 D5 C5 A4.

## 짐노페디 1번 — Gymnopédie No. 1

- 작곡: Erik Satie (1866–1925), 1888년. 제1번 최초 출판: 1888년.
- 사보: **Evin Robertson**.
- 사용 판본: 원판 복각 **Dover Edition** 기반, Mutopia `2014/12/14-37`.
- [Mutopia 작품·이용 조건](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=37)
- [고정된 원문](https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/SatieE/gymnopedie_1/gymnopedie_1.ly)
- 보관 파일: `public/scores/gymnopedie_1.ly`
- SHA-256: `420a52244e9fbe106dd33ba2cac84414fd66e0d01c6d472205bad39678d4ce04`
- 원문 이용 표시: **Public Domain**, 사보자가 퍼블릭 도메인으로 공개. 원문은 Dover판의 새 번역문을 제외했다고 명시합니다. 본 서비스도 번역문을 사용하지 않습니다.
- 발췌: `top` 성부의 **5–21마디, 22개의 새 어택**. 두 문장으로 구분합니다.
- 변경: 반주와 첫 네 마디, 5마디 첫 박의 쉼을 생략하고 첫 선율부터 재생합니다. 원래 음높이·음 길이를 유지합니다. 9–12마디 F♯4 붙임줄은 12박의 음 하나, 19–21마디 E4는 9박의 음 하나로 합쳤습니다. 두 문장을 이어 들을 때 13마디 첫 박의 여백은 앞 문장 끝의 한 박 간격으로 표현합니다.
- 확인용 시작 음: F♯5 A5 G5 F♯5 C♯5 B4 C♯5 D5 A4 F♯4.
- 원문에 숫자 템포가 없어 미리 듣기는 연습용 **4분음표 = 72**로 설정했습니다. 작곡가의 메트로놈 지시라고 주장하지 않습니다.

## 연습 데이터와 동작

`src/songs.ts`의 `beats`는 4분음표를 1로 한 음 길이이고 `gapAfter`는 다음 음 전의 쉼입니다. 미리 듣기에만 적용합니다. 따라 치기는 지정된 **음높이와 순서**만 확인하며 리듬·누른 시간·운지법은 평가하지 않습니다. 잘못 누른 음은 다음 단계로 넘기지 않습니다.

연습 진도는 현재 화면에만 유지되며 새로고침하면 초기화됩니다. 키보드, 화면 건반, MIDI의 실제 note-on이 동일한 판정 경로를 사용하고 미리 듣기·데모는 진도에 반영하지 않습니다. 음역 밖의 다음 음은 컴퓨터 키보드의 옥타브를 자동으로 맞춥니다.
