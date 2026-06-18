# 개선 로드맵 — 스타일 편집 & 테마

오픈소스 공개를 염두에 두고, 주요 이력서 도구(Reactive Resume, JSON Resume, RenderCV,
OpenResume, FlowCV, Typst 계열, HackMyResume)를 조사해 정리한 개선 작업 목록입니다.
효력 태그: **S** ≈ 반나절, **M** ≈ 1–2일, **L** ≈ 3일+.

핵심 결론: **"자유 CSS"가 아니라 "구조화된 스타일 토큰"** 이 정답입니다. Reactive Resume도(PDF로
내보내기 때문에) RenderCV도 자유 CSS를 피하고 토큰/디자인 스키마를 씁니다 — `printToPDF`로
내보내는 이 앱에 정확히 들어맞습니다. 테마는 **(토큰 기본값 묶음) + (렌더러)** 로 정의하는 것이
가장 가볍습니다.

---

## ✅ 이번 라운드에 적용됨

- **cv.css의 CSS 변수화** — 색·크기 하드코딩을 `var(--cv-*)`로 전환(`--cv-body-size`,
  `--cv-name-size`, `--cv-heading-size`, `--cv-line-height`, `--cv-rule-width`). 본문 크기는
  `calc(var(--cv-body-size) * 비율)`로 비례 스케일.
- **우측 스타일 사이드바 + 토큰** — 이름/섹션제목/본문 글씨 크기, 줄 간격, 선 굵기 슬라이더.
  미리보기·PDF에 즉시 반영, 변경 시 재페이지네이션.
- **기본값으로 초기화 버튼** — `DEFAULT_STYLE`로 리셋.
- 스타일은 `config.json`에 앱 단위로 영속.

---

## 다음 작업 — Style editing UI

- **액센트 색상 토큰** (S) — 현재 `#2f6feb` 하드코딩을 `--cv-accent`로. 섹션 제목·링크·말머리.
- **폰트 패밀리 선택** (S) — 번들된 폰트(현 Source Sans Pro + 세리프 + 한글 안전 글꼴) 중 선택.
  오프라인 요건상 Google Fonts 대신 폰트 파일 동봉, `--cv-font-body`로 노출.
- **페이지 여백 토큰** (M) — `14mm/12mm` 패딩을 변수화. 단, PreviewPane의 `PAGE_H` 상수도 같은
  변수에서 계산하도록 연동해야 페이지 분할이 정확.
- **용지 크기(A4/Letter)** (S) — `210mm/297mm` 하드코딩을 `--cv-page-size` 토큰으로. 비한국권 사용자.
- **0.5pt 미세 조절 + 라이브 프리뷰** (S) — 한 페이지에 맞추기 위한 스테퍼. (Reactive Resume는 0.1pt)
- **언어별 스타일 오버라이드** (M) — 한글은 영어와 다른 줄 간격/제목 크기를 원하는 경우. `style`을
  `{ base, ko?, en? }`로 두고 렌더 시 병합.

## Theme/template architecture & registration

- **테마 = 토큰 기본값 JS 객체, 배열로 등록** (M) — `themes = [{ id, name, nameKo, tokens:{…} }]`.
  테마 선택 = `style`을 `theme.tokens`로 시드, 사용자 조정은 그 위에 오버라이드.
- **헤더에 테마 드롭다운** (S) — 프로필/언어 셀렉트와 같은 패턴. 기본 2–3종(Modern Blue / 모노크롬
  Classic / 학술 세리프) 동봉.
- **레이아웃 변형 토큰** (L) — 색뿐 아니라 *구조*도 바꾸려면(2단, 가운데 정렬 헤더, 제목 박스/라인
  스타일) `--cv-heading-style: line|box|plain` 같은 변형을 먼저. 컴포넌트 단위 템플릿은 그 다음.
- **"테마 기여" 경로 문서화** (S) — `themes/` 폴더 + 토큰 키 한 장 스키마 문서. 빌드 도구 없이 파일
  하나 추가 → 레지스트리 배열에 등록. (JSON Resume 테마 문서의 계약 명확성을 모델로)
- **(확장) 데이터 폴더의 JSON 테마 로드** (M) — `mytheme.theme.json`을 프로필 옆에 두면 드롭다운에
  등장. 오프라인 유지하며 무재컴파일 확장점.

## API / framework for extensibility

- **순수 `renderResume(cv, style, opts) → HTML/DOM` 코어 추출** (M) — 렌더링을 Vue 상태에서 분리.
  가장 레버리지 큰 구조 변경(JSON Resume의 순수 `render()`와 동형). 아래 항목들을 가능케 함.
- **헤드리스 CLI** (M) — `cv build <profile.json> --theme X --lang ko -o out.pdf`. 렌더 코어 +
  헤드리스 `printToPDF`. RenderCV/HackMyResume의 CLI와 동일선상, CI 친화적.
- **테마 토큰 TS/JSDoc 인터페이스 공개** (S) — 기여자 자동완성/검증.

## Data schema & portability

- **JSON Resume 가져오기/내보내기(언어별)** (M) — `ko`/`en` 루트를 JSON Resume 스키마(`basics`,
  `work`, `education`, `publications`, `skills`, `languages`, `awards`, `projects`)로 매핑. 언어당
  표준 `resume.json` 한 개 출력(커뮤니티 이중언어 관례). 400+ JSON Resume 테마와 상호운용.
- **내부 모델은 `ko`/`en` 유지, JSON Resume는 상호운용 포맷으로만** (S) — JSON Resume는 네이티브
  다국어 미지원. 구조를 그에 맞춰 바꾸지 말고 매핑/언어접미사 관례만 문서화.
- **스키마 버전·검증 확장** (S) — 이미 `_meta.schemaVersion: 4`. `style`/테마에도 버전 부여,
  가져오기 시 가벼운 검증.

## Other polish

- **PDF/프리뷰 충실도 불변 유지** (S, 상시) — 모든 토큰은 `printToPDF`가 캡처하는 그 `.cv-sheet`
  DOM에 적용(현재 그러함). 토큰 방식이 자유 CSS보다 PDF-안전한 이유.
- **`alert()/confirm()` → 인라인 토스트** (S) — App.vue의 블로킹 알림을 비차단 알림 컴포넌트로.
- **테마/스타일은 이미 (선택) 프로필별 가능** — `style`을 프로필 블롭에 넣으면 프로필 전환 시
  자동 적용. (현재는 앱 단위 `config.json`; 프로필별로 옮기는 건 위 가능 항목)

### 권장 순서 (크리티컬 패스)
CSS 변수 → 사이드바+토큰 → 리셋 **(여기까지 완료)** → 테마 객체+드롭다운 → 렌더 코어 추출 →
CLI / JSON Resume 상호운용. 구조 템플릿(L)은 토큰/테마가 검증된 뒤로.

---

### 조사한 도구 (출처)
- Reactive Resume — [custom styles](https://docs.rxresu.me/guides/using-custom-styles), [frontend 구조](https://docs.rxresu.me/engineering/how-it-works-the-frontend)
- JSON Resume — [theme dev](https://jsonresume.org/theme-development), [schema](https://jsonresume.org/schema), [i18n 논의](https://github.com/jsonresume/resume-schema/issues/35)
- RenderCV — [design field](https://docs.rendercv.com/user_guide/yaml_input_structure/design/), [GitHub](https://github.com/rendercv/rendercv)
- OpenResume — [builder](https://www.open-resume.com/resume-builder), [GitHub](https://github.com/xitanggg/open-resume)
- FlowCV — [flowcv.com](https://flowcv.com/)
- Typst — [modern-cv](https://typst.app/universe/package/modern-cv/)
- HackMyResume — [GitHub](https://github.com/hacksalot/HackMyResume)
