# 프론트엔드 전면 리디자인 설계

작성일: 2026-07-31

## 배경

PostHub 프론트는 기능이 모두 붙어 있지만 디자인 레이어가 비어 있다. 현재 상태:

- `src/index.css`는 `@tailwind` 지시자 3줄이 전부이고, `tailwind.config.js`의 `theme.extend`는 비어 있다. **디자인 토큰이 하나도 없다.**
- `src/App.css`는 Vite 기본 보일러플레이트 그대로다. `#root`에 `text-align: center`, `padding: 2rem`, `max-width: 1280px`가 걸려 있어 각 페이지의 컨테이너와 충돌하고, 쓰이지 않는 로고 회전 애니메이션이 남아 있다.
- 색이 `bg-blue-500`, `bg-red-500` 형태로 컴포넌트마다 하드코딩돼 있다.
- 사이트 헤더(로고 + 로그인 상태)가 `BoardPage`에만 있다. 나머지 6개 페이지는 헤더 없이 뜨고, `SearchPage`는 제목조차 없다.
- 모든 사용자 피드백이 `window.alert` / `confirm` / `prompt`다. 9개 파일에 42곳.

## 목표

일관된 디자인 시스템 위에 7개 페이지를 다시 얹고, 브라우저 기본 팝업을 자체 UI로 교체한다.

## 비목표

- 기능 추가·변경 없음. 라우팅 구조, API 호출, 인증 흐름은 그대로 둔다.
- 마크다운 에디터(별도 설계 문서 존재)는 이 작업 범위 밖이다.
- 백엔드 변경 없음.

## 확정된 결정

브레인스토밍에서 정한 것:

| 항목 | 결정 |
|---|---|
| 범위 | 전면 리디자인 (토큰 → 컴포넌트 → 전 페이지) |
| 톤 | 미니멀 문서형 — 무채색 본문, 포인트 컬러 하나, 장식 최소 |
| 컴포넌트 | 직접 구축. 새 런타임 의존성 0개 |
| 팝업 | `alert`/`confirm`/`prompt` 전부 교체 |
| 다크모드 | 처음부터 라이트/다크 둘 다 + 토글 |
| 게시글 목록 | 정제된 테이블 (그림자·라운드·회색 배경 제거, 선으로만 구분) |
| 좁은 화면 | 열을 제목 + 메타 한 줄로 접기 (정보 손실 없음) |
| 팔레트 | 따뜻한 회색(stone) + 초록(emerald) |

## 디자인 토큰

색은 CSS 변수로 정의하고 Tailwind가 참조한다. 컴포넌트에서는 의미 이름만 쓴다 — `text-fg`, `bg-surface`는 쓰되 `text-stone-800`은 쓰지 않는다. 색을 바꿀 때 `tokens.css` 한 파일만 고치기 위해서다.

### 팔레트

| 토큰 | 라이트 | 다크 | 쓰임 |
|---|---|---|---|
| `bg` | `#ffffff` | `#0c0a09` | 페이지 배경 |
| `surface` | `#fafaf9` | `#1c1917` | 입력창·모달 배경 |
| `border` | `#e7e5e4` | `#292524` | 헤더 밑줄, 테이블 헤더 구분선 |
| `border-subtle` | `#f5f5f4` | `#1c1917` | 테이블 행 구분선 |
| `fg` | `#1c1917` | `#fafaf9` | 본문·제목 |
| `fg-muted` | `#78716c` | `#a8a29e` | 작성자·날짜 |
| `fg-subtle` | `#a8a29e` | `#78716c` | 열 헤더, 플레이스홀더 |
| `accent` | `#047857` | `#34d399` | 주요 버튼, 활성 탭, 링크, 포커스 링 |
| `accent-fg` | `#ffffff` | `#052e21` | 포인트색 배경 위 글자 |
| `accent-subtle` | `#ecfdf5` | `#022c22` | 활성 탭 배경 |
| `danger` | `#b91c1c` | `#f87171` | 삭제 버튼, 오류 메시지 |
| `danger-fg` | `#ffffff` | `#450a0a` | 위험색 배경 위 글자 |
| `danger-subtle` | `#fef2f2` | `#450a0a` | 오류 토스트 배경 |

### 상태 색 규칙

포인트 컬러가 초록이라 "성공 = 초록" 관례와 충돌한다. 규칙을 명시한다:

- **초록은 브랜드 포인트 전용이다.** 성공 신호로 쓰지 않는다.
- **성공 토스트는 무채색**(`surface` 배경 + `fg` 글자 + 체크 아이콘)이다.
- **오류만 `danger`** 빨강을 쓴다.

이렇게 하면 "삭제 실패" 빨강과 "브랜드 초록"이 한 화면에 있어도 의미가 겹치지 않는다.

### 구현 형태

`src/styles/tokens.css`에 RGB 채널값으로 정의한다. 채널로 두는 이유는 Tailwind의 투명도 수식어(`bg-bg/50`)를 살리기 위해서다.

```css
:root {
  --color-bg: 255 255 255;
  --color-surface: 250 250 249;
  --color-border: 231 229 228;
  /* ... */
}

.dark {
  --color-bg: 12 10 9;
  --color-surface: 28 25 23;
  --color-border: 41 37 36;
  /* ... */
}
```

`tailwind.config.js`:

```js
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        // ...
      },
    },
  },
}
```

## 테마 전환

`<html>`의 `dark` 클래스로 전환한다.

- 최초 방문: `prefers-color-scheme`을 따른다.
- 토글하면 `localStorage`의 `theme` 키에 저장하고, 이후로는 저장값이 우선한다.
- **첫 페인트 깜빡임 방지**: React 마운트 전에 클래스가 붙어야 하므로, `index.html`의 `<head>`에 인라인 스크립트를 넣는다. 번들에 넣으면 늦다.

```html
<script>
  (function () {
    var saved = localStorage.getItem('theme');
    var dark = saved
      ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  })();
</script>
```

`useTheme` 훅이 현재 테마와 토글 함수를 제공하고, 저장값이 없을 때만 시스템 설정 변화를 따라간다.

## 컴포넌트 구조

새로 만들 파일:

```
src/styles/tokens.css
src/components/ui/Button.tsx
src/components/ui/Input.tsx
src/components/ui/Textarea.tsx
src/components/ui/Field.tsx        라벨 + 입력 + 에러 메시지 묶음
src/components/ui/Dialog.tsx
src/components/ui/Toast.tsx        ToastProvider + useToast
src/components/ui/toastStore.ts    모듈 레벨 토스트 큐
src/components/Layout.tsx          헤더 + 본문 컨테이너
src/components/Header.tsx
src/components/ThemeToggle.tsx
src/hooks/useTheme.ts
```

삭제할 파일: `src/App.css`

### Button

변형 `primary` / `secondary` / `ghost` / `danger`, 크기 `sm` / `md`. 모든 변형에 `accent` 포커스 링을 공통으로 건다.

### Dialog

`confirm`과 `prompt`를 대체한다. 직접 구현하므로 아래를 빠짐없이 처리해야 한다:

- 열릴 때 첫 포커스 가능 요소로 포커스 이동
- Tab / Shift+Tab이 다이얼로그 밖으로 나가지 않도록 순환
- Escape로 닫기
- 열려 있는 동안 배경 스크롤 잠금
- 닫힐 때 **열기 전 포커스가 있던 요소로 복귀**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

`prompt` 대체용으로 입력 필드를 받는 형태도 지원한다(게시판 이름 생성·수정).

### Toast

`alert`를 대체한다. **훅과 모듈 함수 두 경로가 모두 필요하다.**

`src/api/axios.ts:96`의 세션 만료 알림은 axios 인터셉터 안, 즉 **React 트리 밖에서** 발생한다. 훅으로는 호출할 수 없다. 따라서 토스트 큐를 모듈 레벨 스토어(`toastStore.ts`)에 두고:

- React 컴포넌트는 `useToast()`로 접근
- 비 React 코드는 `toast.error(...)`를 직접 호출
- `ToastProvider`가 스토어를 구독해 렌더링

토스트는 `role="status"`, `aria-live="polite"`로 읽히게 한다. 오류는 `aria-live="assertive"`.

## 레이아웃

`Layout`이 헤더와 본문 폭을 책임진다. 7개 페이지 전부를 감싼다.

헤더 구성: 로고(→ `/boards`) · 검색창 · 테마 토글 · 로그인 상태(로그인 버튼 또는 로그아웃).

`App.css`를 지우면서 `#root`의 폭 제한과 가운데 정렬이 사라진다. 폭은 `Layout`이 정한다. 로그인·회원가입은 좁은 폭(카드형), 나머지는 본문 폭을 쓴다.

## 게시글 목록 (PostTable)

### 데스크톱

`<table>` 유지. 그림자·라운드·회색 헤더 배경을 제거하고 선으로만 구분한다.

- 열 헤더: 소문자 대비 작은 크기, `fg-subtle`, 아래 `border` 한 줄
- 행 구분: `border-subtle`
- 제목은 왼쪽 정렬, 조회수·댓글은 **오른쪽 정렬**(숫자열을 눈으로 훑기 위해)
- 행 hover 시 `surface` 배경

**`TITLE_DISPLAY_MAX`(20자 자르기) 로직을 제거한다.** 지금은 화면 폭과 무관하게 21자부터 `...`으로 잘린다. CSS 말줄임(`truncate`)으로 바꿔 실제 넘칠 때만 잘리게 한다. 전체 제목은 `title` 속성에 유지한다.

### 좁은 화면 (`max-sm`)

같은 마크업에 CSS만 다르게 먹인다. 마크업을 두 벌 쓰지 않는다.

- `thead`를 감춘다
- `tr`을 블록으로 바꿔 한 행 = 한 덩어리
- 제목은 블록으로 굵게, 나머지 셀은 인라인으로 이어 붙여 메타 한 줄
- 메타 사이 구분점은 `::before`로 넣는다

열 헤더가 사라지므로 **숫자만 남으면 무슨 값인지 알 수 없다.** 좁은 화면에서만 보이는 라벨을 셀 안에 함께 둔다:

```tsx
<td><span className="sm:hidden">조회 </span>{post.viewCount}</td>
```

이렇게 하면 화면에서도 스크린 리더에서도 "조회 142"로 읽힌다.

## 팝업 교체

`alert` / `confirm` / `prompt` 42곳을 성격에 따라 셋으로 나눈다. **전부 토스트로 바꾸지 않는다.**

| 유형 | 개수 | 교체 대상 |
|---|---|---|
| 폼 검증 실패 | 11 | 인라인 필드 에러 |
| 삭제 확인 (`confirm`) | 3 | `Dialog` |
| 이름 입력 (`prompt`) | 2 | `Dialog` + 입력 필드 |
| 성공·실패 알림 | 26 | `Toast` 25곳, 삭제 1곳 (아래 "덜어내는 것") |

### 폼 검증을 토스트로 옮기지 않는 이유

"비밀번호는 8자 이상 20자 이하여야 합니다"는 **어느 칸이 틀렸는지 알려줘야 쓸모가 있다.** 화면 구석 토스트로 띄우면 사용자가 알림을 보는 동안 입력칸은 그대로다. 해당하는 입력 아래에 `danger` 색으로 붙이고, 입력 테두리도 `danger`로 바꾼다. `aria-describedby`로 입력과 연결하고 `aria-invalid`를 세운다.

대상: `LoginPage`(4), `SignupPage`(4), `PostWritePage`(1), `PostEditPage`(1), `PostDetailPage` 댓글(1).

### 덜어내는 것

`LoginPage`의 `alert('로그인 성공!')`은 **없앤다.** 로그인 성공 시 게시판으로 이동하므로 화면 전환 자체가 피드백이다.

### 흐름이 바뀌는 부분

`window.confirm`은 동기라 지금 코드는 한 줄로 이어진다:

```ts
if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
await api.delete(`/posts/${postId}`);
```

`Dialog`는 비동기다. "다이얼로그 열기 → 사용자 확인 → 그때 삭제"로 쪼개야 하고, **무엇을 지우려던 것인지**(어느 게시판 / 어느 댓글)를 상태로 들고 있어야 한다. 삭제 핸들러 3곳이 구조적으로 바뀐다:

- `BoardPage` 게시판 삭제 (`boardId`, `boardName` 보관)
- `PostDetailPage` 게시글 삭제
- `PostDetailPage` 댓글 삭제 (`commentId` 보관)

게시판 생성·수정(`prompt` 2곳)도 같은 형태로, 입력값을 다이얼로그 상태에 둔다.

## 테스트 전략

기존 테스트 중 `vi.stubGlobal('alert', vi.fn())`을 거는 파일은 셋이다 — `BoardPage.test.tsx`, `PostDetailPage.test.tsx`, `LikeButton.test.tsx`. 전역 스텁이라 **`alert` 호출이 사라져도 테스트가 깨지지는 않는다.** 스텁이 불필요해질 뿐이므로 함께 정리한다.

실제로 손봐야 하는 것:

1. **마크업 변경에 따른 셀렉터 수정** — 클래스 기반 단언이 있다면 역할·텍스트 기반으로 바꾼다.
2. **삭제 흐름이 2단계가 된다** — "삭제 버튼 클릭" 뒤에 "다이얼로그의 확인 클릭"이 추가된다. 기존에 클릭 한 번으로 API 호출을 단언하던 테스트는 전부 이 단계를 넣어야 한다.
3. **토스트는 비동기** — `alert`는 동기라 호출 직후 단언할 수 있었지만, 토스트는 렌더링을 기다려야 한다. `findBy*`를 쓴다.

새로 추가할 테스트:

- `Dialog` — Escape로 닫힘, 포커스가 다이얼로그 안에서 순환, 닫으면 원래 버튼으로 포커스 복귀
- `Toast` — 모듈 함수(`toast.error`)로 띄운 것이 Provider에 렌더링되는지 (axios 인터셉터 경로 보장)
- `useTheme` — 저장값 없으면 시스템 설정, 토글하면 `localStorage`에 기록

**`refreshClient.test.ts`의 경합 테스트는 반드시 유지한다.** 리프레시가 단일 비행이 아니면 토큰 계열 전체가 폐기돼 로그인 세션이 통째로 날아간다.

## 작업 순서

아래에서 위로 쌓는다. 단계마다 커밋한다.

1. **토큰·테마** — `tokens.css`, `tailwind.config.js`, `index.html` 인라인 스크립트, `useTheme`, `App.css` 삭제
2. **폼 프리미티브** — `Button`, `Input`, `Textarea`, `Field`
3. **Toast** — `toastStore`, `ToastProvider`, `useToast`, 모듈 함수
4. **Dialog** — 포커스 트랩, Escape, 스크롤 잠금, 포커스 복귀
5. **Layout·Header·ThemeToggle** — 7개 페이지 감싸기
6. **PostTable** — 정제된 테이블 + 좁은 화면 접기
7. **페이지별 팝업 교체** — 페이지 하나당 커밋 하나
   `BoardPage` → `PostDetailPage` → `LoginPage` → `SignupPage` → `PostWritePage` → `PostEditPage` → `SearchPage` → `useLike` / `axios.ts`
8. **전 화면 점검** — 라이트/다크 × 데스크톱/모바일, 불필요해진 alert 스텁 정리

## 검증

각 단계 커밋 전:

- `npm run test`
- `npm run build` (`tsc -b` 포함)
- `npm run lint`

전체 완료 후 실제 브라우저 확인:

- 로컬 백엔드를 띄우고 `.env.local`의 `VITE_API_URL=http://localhost:8080/api`로 붙인다. `.env`는 배포용 주소라 건드리지 않는다.
- dev 서버는 IPv6에만 바인딩되므로 **`localhost:5173`**으로 연다. `127.0.0.1:5173`은 붙지 않는다.
- 라이트/다크 각각, 데스크톱/모바일 폭 각각 7개 페이지
- 키보드만으로 모달을 열고 닫고, 포커스가 원래 버튼으로 돌아오는지

부수 효과: 팝업을 걷어내면 **브라우저 자동화가 안정된다.** 지금은 `alert`가 뜨면 탭이 멈춰서 페이지를 로드할 때마다 오버라이드를 다시 걸어야 한다.

## 리스크

**가장 큰 리스크는 Dialog 구현이 아니라 7단계(팝업 교체)다.** 동기 `confirm`을 비동기 다이얼로그로 바꾸면서 삭제 핸들러 3곳의 제어 흐름이 바뀌고, 그에 걸린 테스트를 전부 2단계로 고쳐야 한다. 페이지 하나씩 커밋해 문제가 생기면 되돌릴 범위를 좁힌다.

포커스 트랩을 직접 구현하는 것은 "직접 구축" 선택의 대가다. 위 Dialog 항목의 체크리스트를 빠짐없이 테스트로 덮는다.

## 브랜치 전략

리디자인은 `feat/redesign`에서 진행한다.

**선행 조건**: `feat/auth-refresh-integration`(커밋 6개)이 `main`에 머지되어야 한다. 이 브랜치는 `src/api/axios.ts`, `src/pages/BoardPage.tsx`, `src/pages/BoardPage.test.tsx`를 수정하는데, **리디자인에서 갈아엎을 파일과 정확히 겹친다.** 머지 전 `main`에서 브랜치를 따면 같은 줄에서 충돌이 발생한다.

참고로 로컬 `main`은 `origin/main`보다 13커밋 앞서 있고(검색·좋아요 작업), 원격에 `feat/auth-refresh-integration`은 없다.

`.superpowers/`를 `.gitignore`에 추가한다. 브레인스토밍 목업이 커밋에 딸려 들어가지 않도록 한다.
