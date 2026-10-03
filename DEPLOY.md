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

MIDI 연결에는 Web MIDI를 지원하는 브라우저와 HTTPS가 필요합니다. GitHub Pages 기본 주소는 HTTPS를 지원합니다. 도메인이나 저장소 이름을 변경하면 배포 경로도 함께 확인해야 합니다.
