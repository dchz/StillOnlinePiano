# GitHub Pages로 사이트 공개하기

이 저장소의 `main` 브랜치에는 **Still Online Piano**의 소스 코드가 들어 있습니다. `.github/workflows/site.yml`은 코드를 설치·테스트·빌드하고, 준비된 정적 파일을 GitHub Pages에 배포합니다.

## GitHub에서 처음 한 번 설정하기

1. 저장소의 [Settings → Pages](https://github.com/dchz/StillOnlinePiano/settings/pages)를 엽니다.
2. **Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. [Actions → Build, test, and deploy site](https://github.com/dchz/StillOnlinePiano/actions/workflows/site.yml)를 엽니다.
4. **Run workflow**에서 `main`을 선택해 실행합니다. 이미 실행 중이라면 그 결과를 먼저 확인합니다.
5. **Build and test**와 **Deploy to GitHub Pages**가 모두 성공하면 실행 화면의 배포 주소를 엽니다.

기본 GitHub Pages 주소는 배포 성공 후 `https://dchz.github.io/StillOnlinePiano/`입니다. 코드 업로드나 테스트 성공만으로 공개 사이트가 활성화된 것은 아니며, 배포 작업의 성공을 확인해야 합니다.

Pages 메뉴에서 계정 요금제 또는 저장소 공개 범위 관련 안내가 나타나면 해당 저장소의 GitHub Pages 지원 여부를 확인하세요. 이 프로젝트의 설정은 저장소의 공개 범위를 변경하지 않습니다.

## 수정한 내용을 공개 사이트에 반영하기

수정한 코드를 `main`에 올리면 같은 워크플로가 다시 실행됩니다. 테스트와 빌드를 통과한 뒤 사이트가 갱신됩니다. Pull request에서는 테스트와 빌드만 실행합니다.

API 키나 별도의 서버는 필요하지 않습니다. GitHub가 제공하는 워크플로 인증을 사용하며, 별도로 개인 토큰을 저장소에 넣을 필요도 없습니다.

## 배포 전 컴퓨터에서 확인하기

```sh
npm ci
npm test
npm run test:browser
npm run build -- --base=/StillOnlinePiano/
npm run preview -- --base=/StillOnlinePiano/
```

미리보기 서버에서 `/StillOnlinePiano/` 경로를 확인합니다. 배포용 빌드는 JavaScript, 글꼴, 음원을 모두 이 경로에서 가져오도록 구성됩니다. 브라우저 테스트의 Chromium 설치 방법은 `README.md`를 참고하세요.

MIDI 연결에는 Web MIDI를 지원하는 브라우저와 HTTPS가 필요합니다. GitHub Pages 기본 주소는 HTTPS를 지원합니다. 워크플로는 Pages의 공개 주소에 맞춰 배포 경로를 자동으로 선택합니다.

## stillpiano.com 연결하기

Cloudflare의 `stillpiano.com → DNS → Records`에서 아래 레코드를 추가합니다. 모든 레코드의 프록시는 **DNS only(회색 구름)**, TTL은 **Auto**로 설정합니다.

| 유형 | 이름 | 값 |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `dchz.github.io` |

DNS가 반영되면 저장소의 **Settings → Pages → Custom domain**에 `stillpiano.com`을 저장합니다. GitHub Actions로 배포하므로 `CNAME` 파일만 추가해서는 Pages의 사용자 도메인이 설정되지 않습니다.

도메인을 설정한 뒤 배포 워크플로를 다시 실행합니다. `actions/configure-pages`에서 읽은 공개 주소에 맞춰 `/`로 빌드하므로 JavaScript, 글꼴, 음원, 악보를 새 도메인에서 불러올 수 있습니다. 로컬에서는 `npm run build -- --base=/`와 `npm run preview -- --base=/`로 확인합니다.

GitHub의 인증서 발급이 끝나면 **Enforce HTTPS**를 켜고 `https://stillpiano.com/`에서 사이트와 MIDI 연결을 확인합니다. DNS와 인증서 반영에는 시간이 걸릴 수 있습니다. `www.stillpiano.com`과 기존 GitHub Pages 주소의 리디렉션도 확인합니다.

## 검색엔진에 사이트 등록하기

현재 대표 주소는 `https://stillpiano.com/`입니다. `index.html`의 검색 제목·설명, canonical, 공유 메타데이터와 WebSite 구조화 데이터에 이 주소를 사용합니다. `public/robots.txt`는 검색 수집을 허용하고 사이트맵 위치를 알리며, `public/sitemap.xml`에는 실제 공개 페이지인 홈페이지만 등록합니다. 대표 도메인을 바꾸거나 독립된 곡 페이지를 추가하면 해당 설정도 갱신하세요.

1. [Google Search Console](https://search.google.com/search-console/welcome)에서 **URL 접두사**에 `https://stillpiano.com/`을 입력합니다.
2. **HTML 태그** 소유확인 방법을 선택하고, 제공된 `google-site-verification` 메타태그를 `index.html`의 `<head>`에 추가해 배포합니다. React 실행 후 삽입하지 말고 HTML 원문에 넣습니다. 제공값을 임의로 만들거나 확인 후 삭제하지 마세요.
3. Google 화면에서 **확인**을 누릅니다. **사이트맵** 메뉴에 `https://stillpiano.com/sitemap.xml`을 제출하고, **URL 검사**에서 홈페이지의 **색인 생성 요청**을 실행합니다.
4. [네이버 서치어드바이저](https://searchadvisor.naver.com/)의 웹마스터 도구에서도 같은 대표 주소를 등록합니다. HTML 태그 방식의 `naver-site-verification` 메타태그를 HTML 원문에 추가해 배포한 뒤 소유확인을 완료합니다.
5. 네이버의 **요청 → 사이트맵 제출**에 같은 사이트맵 주소를 입력하고, 필요하면 **요청 → 웹페이지 수집**에서 홈페이지 수집을 요청합니다.

소유확인은 운영자의 Google·네이버 계정에서 완료해야 합니다. 등록·사이트맵 제출·수집 요청은 검색 노출이나 순위를 보장하지 않습니다. 실제 색인 상태는 Google URL 검사와 각 도구의 보고서에서 확인합니다.

현재 앱은 JavaScript로 화면을 그립니다. Google은 JavaScript를 렌더링할 수 있지만, 원본 HTML만 수집하는 검색엔진은 본문을 충분히 읽지 못할 수 있습니다. 곡별 검색 유입을 확대할 때는 곡마다 직접 연습을 시작할 수 있는 고유 주소와 실제 설명을 만들고, 해당 내용을 정적 HTML로 제공하는 방식을 검토하세요.

공식 안내: [Google 소유권 확인](https://support.google.com/webmasters/answer/9008080?hl=ko), [Google URL 검사](https://support.google.com/webmasters/answer/9012289?hl=ko), [네이버 소유확인](https://searchadvisor.naver.com/guide/faq-start-register), [네이버 사이트맵 제출](https://searchadvisor.naver.com/guide/request-feed).
