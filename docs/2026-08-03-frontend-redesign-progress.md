# 프론트엔드 전면 리디자인 — 진행 상황

작성일: 2026-08-03
브랜치: `feat/redesign` (**원격 미푸시**)
설계: `docs/superpowers/specs/2026-07-31-frontend-redesign-design.md`
계획: `docs/superpowers/plans/2026-07-31-frontend-redesign.md`
실행 원장: `.superpowers/sdd/2026-07-31-frontend-redesign/progress.md` (git 제외 대상)

## 한 줄 요약

12개 태스크 중 **8개 완료**, 사용자 요청으로 중단. 디자인 시스템 기반(토큰·프리미티브·레이아웃)이 전부 올라갔고 페이지 5개 중 1개(`BoardPage`)를 옮겼다.

## 지표

| 항목 | 시작 | 현재 |
|---|---|---|
| 테스트 | 44개 | **80개** (파일 15개) |
| lint 오류 | 6개 | **4개** |
| 팔레트 하드코딩 | 전역 | `src/components/` **0건** (페이지에만 남음) |
| 런타임 의존성 | 4개 | **4개** (추가 없음) |

남은 lint 오류 4건은 전부 `src/pages/` 아래다 — `LoginPage`, `PostDetailPage`, `PostEditPage`, `SearchPage`. 모두 `react-hooks/set-state-in-effect` 계열이며, 해당 파일을 다시 쓰는 Task 9~11이 함께 정리하기로 되어 있다.

## 완료한 태스크

### 1. 디자인 토큰과 테마 전환 — `53288f7`, `35e1d51`

- `src/styles/tokens.css`에 의미 토큰 13종을 라이트/다크 두 벌로 정의. RGB 채널로 적어 Tailwind 투명도 수식어(`bg-bg/50`)가 살아 있다.
- `tailwind.config.js`가 `rgb(var(--color-x) / <alpha-value>)`로 참조. `darkMode: 'class'`.
- `useTheme` — 저장값 없으면 시스템 설정을 실시간으로 따라가고, 한 번 토글하면 그 선택이 우선한다.
- `index.html`에 인라인 스크립트를 넣어 React 마운트 전에 테마 클래스를 붙인다. 번들에 넣으면 늦어서 다크모드 첫 페인트가 흰 화면으로 번쩍인다.
- `src/App.css` 삭제. Vite 보일러플레이트의 `#root { text-align: center; padding: 2rem; max-width: 1280px }`가 모든 페이지 컨테이너와 싸우고 있었다.
- 테스트 셋업에 `matchMedia` 스텁 추가 — jsdom에 없어서 없으면 테마를 건드리는 모든 테스트가 `TypeError`로 터진다.

### 2. Button — `746b82c`

`primary`/`secondary`/`ghost`/`danger` × `sm`/`md`. 기본 `type`이 `'button'`이다 — HTML 기본값 `submit`이라 폼 안의 취소 버튼이 폼을 제출해버리는 사고를 막는다.

### 3. Input · Textarea · Field — `a2c0dbf`, `1eb991d`

검증 실패를 토스트가 아니라 입력 아래 인라인으로 보내기 위한 토대. `Field`가 라벨과 `role="alert"` 에러 문단을 렌더링하고, 입력에 `aria-describedby`/`aria-invalid`를 거는 것은 호출부의 몫이다.

공유 클래스는 `inputStyles.ts`에 따로 뒀다. 컴포넌트 파일이 컴포넌트 외의 값을 export하면 `react-refresh/only-export-components`에 걸린다.

### 4. Toast — `0e04454`

`alert` 대체. **훅이 아니라 모듈 함수**(`toast.success` / `toast.error`)인 것이 핵심이다. 세션 만료 알림은 axios 인터셉터, 즉 React 트리 밖에서 발생해 훅으로는 부를 수 없다. 스토어를 모듈에 두고 Provider가 구독한다.

포인트 컬러가 초록이라 **성공을 초록으로 칠하지 않는다.** 성공은 무채색(`surface` + `fg`), 오류만 `danger`. 오류는 `role="alert"`/`aria-live="assertive"`, 성공은 `role="status"`/`aria-live="polite"`.

### 5. Dialog — `0228eea`, `895ca01`

`window.confirm`과 `prompt` 대체. 라이브러리 없이 만들기로 했으므로 접근성 처리를 전부 직접 했다 — 열 때 안으로 포커스, Tab/Shift+Tab 순환, Escape, 배경 스크롤 잠금(원래 값 복원), 닫을 때 원래 버튼으로 포커스 복귀, `role="dialog"` + `aria-modal` + `aria-labelledby`.

### 6. Layout · Header · ThemeToggle — `4afe2df`, `674169a`

사이트 헤더가 `BoardPage`에만 있었다. 나머지 6개 페이지는 로고도 로그인 상태도 없이 떴고 `SearchPage`는 제목조차 없었다. `Layout`으로 묶어 7개 페이지가 같은 헤더를 쓴다. 검색창도 헤더로 올려 모든 페이지에서 검색할 수 있다.

헤더는 반응형 2줄 구조다. 좁은 화면에서는 검색창이 아래 줄로 내려가되 **DOM에는 한 번만 마운트**된다(두 번 마운트하면 입력 상태가 갈린다).

### 7. 공통 컴포넌트 4종 — `b68318c`

- **`PostTable` 재작성** — 그림자·라운드·회색 헤더 배경을 걷어내고 선으로만 구분. 조회수·댓글 오른쪽 정렬. 좁은 화면에서는 행이 블록으로 바뀌어 제목 + 메타 한 줄로 접힌다(마크업 한 벌, CSS만 분기). 열 헤더가 사라지므로 숫자에 '조회'·'댓글' 라벨을 붙였다.
- **`TITLE_DISPLAY_MAX` 제거** — 제목을 20자에서 자르던 로직. 화면 폭과 무관하게 잘려 넓은 화면에서도 제목이 반쪽만 보였다. CSS 말줄임으로 대체.
- **`SearchBox`·`Pagination`·`LikeButton`** — 팔레트 클래스 26곳을 토큰으로 이관. 동작·props·DOM 구조는 그대로라 기존 테스트가 회귀 방지 역할을 했다.

### 8. BoardPage — `33a844e`, `6849075`

브라우저 기본 팝업 10곳 제거 — `window.prompt` 2곳(게시판 생성·이름 수정), `window.confirm` 1곳(삭제), `alert` 7곳.

**단순 치환이 아니었다.** `confirm`/`prompt`는 동기라 기존 코드가 한 줄로 이어졌지만 다이얼로그는 비동기다. "열기 → 사용자 확인 → 그때 실행"으로 쪼개고, 어느 게시판을 무슨 이름으로 바꾸려는지를 판별 유니온(`BoardDialog`)에 담아 확인 클릭 시점까지 들고 간다.

부수적으로:
- 페이지 안에 박혀 있던 헤더·`SearchBox`·`handleLogout` 제거 (Task 6의 `Header`가 맡는다)
- 이모지만 있던 관리자 버튼에 `aria-label` 추가 — 접근 가능한 이름이 없어 스크린 리더에도 테스트에도 안 잡혔다
- 이 파일의 기존 lint 오류 2건 정리. 구현자가 `activeBoardIdRef`로 same-tick stale state 경합까지 해결했고, 리뷰어가 원래 지시보다 나은 해법이라고 평가했다
- 로그아웃 동작 테스트를 `Header.test.tsx`로 복구 (아래 참조)

## 남은 태스크

| # | 대상 | 내용 |
|---|---|---|
| 9 | `PostDetailPage` | `confirm` 2곳(게시글·댓글 삭제) → Dialog, 댓글 검증 1곳 → 인라인, `alert` 7곳 → Toast |
| 10 | `LoginPage`·`SignupPage` | 검증 8곳 인라인화, `alert('로그인 성공!')` 삭제(화면 전환이 곧 피드백) |
| 11 | `PostWritePage`·`PostEditPage`·`SearchPage` | 검증 2곳 인라인화, SearchPage에 제목 추가 |
| 12 | `useLike`·`axios.ts` | 모듈 토스트 경로 연결 + 전 화면 브라우저 점검 |

그다음 전체 브랜치 최종 리뷰 → `finishing-a-development-branch`.

Task 9~11은 **자기가 손대는 파일의 기존 lint 오류도 함께 정리**해야 한다.

## 리뷰가 잡아낸 계획 결함 6건

전부 구현자의 실수가 아니라 **계획 자체의 결함**이었다.

1. **존재하지 않는 CSS 클래스** — 색 키 `'border-subtle'`은 Tailwind에서 `border-border-subtle`을 만든다. 계획이 약속한 `border-subtle`은 CSS를 한 줄도 생성하지 않았다. 빌드 오류도 lint 경고도 없이 조용히 무시되는 종류라 리뷰 없이는 못 잡았을 것이다. → 키를 `divider`로 변경(사용자 결정).
2. **lint 규칙 충돌** — 브리프가 지시한 `inputBase` export가 `react-refresh/only-export-components` 위반. 구현자가 이를 "기존 오류"로 잘못 보고했고, 리뷰어와 컨트롤러가 각각 `eslint`를 직접 돌려 확인했다.
3. **포커스 강탈 버그** — `useEffect(..., [open, onClose])`. 인라인 화살표 콜백이면 부모 리렌더마다 effect가 재실행돼 포커스를 첫 요소로 되돌린다. Task 8이 이 다이얼로그에 게시판 이름 입력을 넣으므로 **한 글자마다 포커스가 날아가 입력 자체가 불가능**해질 뻔했다. Task 8에서 증상으로 발견됐다면 원인 추적이 훨씬 어려웠을 것이다.
4. **모바일 검색 소실** — `hidden sm:block`이 좁은 화면에서 검색을 통째로 제거. 전에는 게시판 목록에서 항상 보이던 기능이라 순수 후퇴였다.
5. **컴포넌트 3종 누락** — 수정 대상 목록에 `SearchBox`·`Pagination`·`LikeButton`이 아예 없었다. `SearchBox`가 헤더로 올라가 전 페이지에 뜨는 상황이라 그대로 뒀으면 "전면 리디자인"이 절반만 된 상태로 끝났다.
6. **커버리지 손실** — `BoardPage` 로그아웃 테스트를 지웠는데(로직이 `Header`로 이동했으니 삭제 자체는 정당) 대체 커버리지가 리포 어디에도 없었다. 리프레시 토큰이 httpOnly 쿠키라 서버가 계열을 폐기하지 않으면 로그아웃이 실제로 끝나지 않는 부분이라 그냥 넘길 수 없었다.

## 컨트롤러 판단 기록

사용자 확인 없이 내린 결정들. 다르게 가고 싶으면 되돌릴 수 있다.

- **lint 전역 제약 완화** — "커밋 전 통과"는 브랜치 출발점부터 깨져 있어 달성 불가능한 제약이었다. "새 오류를 추가하지 않는다"로 바꾸고, 기존 오류는 해당 파일을 다시 쓰는 태스크가 정리하도록 했다. Task 12 종료 시점 기준은 여전히 lint 클린이다.
- **`inputStyles.ts` 분리** — 계획이 자기 전역 제약과 충돌한 케이스. 계획이 스스로 "모든 태스크에 적용된다"고 선언한 전역 제약이 상위 규칙이므로 그쪽을 따랐다. 다운스트림 인터페이스 영향은 없다.
- **Dialog 4건 수정** — 계획이 이미 필수라 선언한 접근성 동작을 테스트가 증명하지 못하는 문제였다. 계획을 거스르는 것이 아니라 이행하는 것으로 판단했다.
- **Task 8에 범위 예외** — `Header.test.tsx` 신규 생성을 허용했다. 커버리지를 없앤 것이 Task 8의 diff이므로 같은 태스크에서 메우는 것이 맞다고 봤다.

사용자에게 물은 것은 두 번뿐이다 — `divider` 이름, 좋아요 초록색.

## 보류한 minor 지적

최종 리뷰에서 병합 전 처리 여부를 판단할 대상.

- `useTheme`의 `localStorage` 접근에 try/catch 없음. `index.html` 인라인 스크립트는 감싸고 있어 두 경로가 불일치한다.
- 저장된 테마 값이 손상됐을 때 인라인 스크립트는 라이트로, `readStored`는 시스템 설정으로 분기해 한 프레임 어긋날 수 있다.
- `matchMedia` `change` 리스너 경로가 테스트되지 않았다.
- `Button`에 `forwardRef` 없음. `Dialog`는 `querySelector`로 포커스를 잡으므로 당장 문제는 없다.
- `Textarea`에 직접 테스트 없음.
- 토스트 hover 시 자동 소멸 일시정지 없음.
- `<header>`의 `role="banner"`가 암묵 역할과 중복. 테스트가 그걸로 헤더를 찾고 있어 유지했다.
- Dialog 배경 클릭 닫기 미테스트.
- `table-layout: fixed`가 없어 `max-w-0` + `truncate` 말줄임이 실제 브라우저에서 항상 걸릴지 jsdom으로는 확인 불가. **Task 12 브라우저 점검에서 확인할 것.**

## 재개 방법

1. **Task 8 재리뷰가 아직 안 돌았다.** `6849075`(Header 로그아웃 커버리지 복구)가 커밋됐지만 scoped re-review를 거치지 않았다. 검증할 내용: 로그아웃이 `/auth/logout`을 부르고 `accessToken`/`userId`/`role` 세 키를 지우는가, 서버 호출이 실패해도 로컬 정리가 진행되는가.
2. Task 9부터 순서대로 진행. 태스크마다 브리프 추출 → 구현자 디스패치 → 리뷰 → (필요시) 수정 루프.
3. 전부 끝나면 전체 브랜치 최종 리뷰, 그다음 `finishing-a-development-branch`.

원장(`.superpowers/sdd/2026-07-31-frontend-redesign/progress.md`)에 태스크별 커밋 범위와 판단 근거가 전부 남아 있다.

## 주의사항

- **원격에 아무것도 푸시하지 않았다.** 로컬 `main`이 `origin/main`보다 앞서 있는 상태를 유지 중이다.
- 로컬 `main`에 `feat/auth-refresh-integration`을 머지했다. 되돌릴 지점은 `d6138af`.
- 브라우저 점검(Task 12)은 로컬 백엔드를 띄우고 `.env.local`의 `VITE_API_URL=http://localhost:8080/api`로 붙인 뒤 **`localhost:5173`**으로 열어야 한다. dev 서버가 IPv6에만 바인딩돼 `127.0.0.1:5173`은 붙지 않는다. `.env`는 배포용 주소라 건드리면 안 된다.
- `refreshClient.test.ts`의 경합 테스트는 건드리지 않는다. 리프레시가 단일 비행이 아니면 토큰 계열 전체가 폐기돼 로그인 세션이 통째로 날아간다.
