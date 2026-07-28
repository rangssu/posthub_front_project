# 글 작성 마크다운 에디터 설계

작성일: 2026-07-28

## 배경

글 작성·수정 화면이 지금은 맨 `<textarea>`다. 서식이 없어 제목, 목록, 코드 블록을 쓸 수
없다. 여기에 마크다운 에디터를 넣는다.

이 작업은 좋아요·검색 작업(`2026-07-28-front-likes-search-design.md`)과 독립이다. 다만
검색 인덱스에 영향을 줄 수 있어 저장 형식 결정에서 그 점을 고려했다.

**백엔드는 수정하지 않는다.**

## 결정과 근거

### 저장 형식은 마크다운

HTML로 저장하면 두 가지가 깨진다:

- **검색** — V9 FULLTEXT 인덱스가 `title + content`에 걸려 있다. 태그가 인덱스에 들어가면
  `div`나 `strong` 같은 태그명이 검색에 잡히고, 태그로 쪼개진 단어는 못 찾는다.
  이를 막으려면 백엔드에 검색용 평문 컬럼과 마이그레이션을 추가해야 한다.
- **보안** — 백엔드는 `content`를 `@NotBlank @Size(max=100_000)`으로만 검증하고 정화를
  전혀 하지 않는다. HTML을 저장하면 `<script>`가 그대로 DB에 들어간다.

마크다운은 저장되는 것이 평문이라 둘 다 해당하지 않는다. 백엔드를 건드릴 이유가 없다.

### 에디터는 @uiw/react-md-editor

툴바, 탭 전환 미리보기, 단축키, 리스트 자동 이어쓰기를 직접 만드는 대신 완성품을 쓴다.
직접 구현하면 결국 이 라이브러리를 다시 만드는 셈이고 엣지 케이스를 더 많이 놓친다.

버전 4.1.1, peer dependency는 `react >=16.8.0`이라 React 19와 충돌하지 않는다.

### 렌더러는 MDEditor.Markdown 하나만 쓴다

`@uiw/react-markdown-preview`(MDEditor의 렌더러)의 의존성을 확인한 결과:

```
react-markdown: ~10.1.0
rehype-raw: ^7.0.0
remark-gfm: ~4.0.0
rehype-prism-plus: ~2.0.0
```

두 가지가 여기서 나온다.

첫째, MDEditor의 렌더러는 `react-markdown` 위에 얹힌 것이다. 둘은 경쟁 관계가 아니라
포함 관계이고, `react-markdown`은 이미 의존성 트리에 있다.

둘째, **`rehype-raw`가 직접 의존성이라 raw HTML이 기본으로 렌더된다.** 라이브러리 공식
문서도 `<IFRAME SRC="javascript:alert(...)">`를 예로 들며 `rehype-sanitize`를 쓰라고
안내한다. 정화는 선택이 아니라 필수다.

상세 화면만 `react-markdown`으로 따로 렌더하는 안도 검토했다. raw HTML을 기본 차단한다는
이점이 있지만, `react-markdown` 단독으로는 표·취소선·코드 하이라이팅이 없어 미리보기와
같아 보이게 하려면 `remark-gfm`, `rehype-prism-plus`, `rehype-slug`를 직접 다시 붙여야
한다. 그것은 `react-markdown-preview`를 손으로 재조립하는 일이고, 조합이 어긋나는 순간
"미리보기와 실제 글이 다르다"는 버그가 난다. 렌더러를 하나로 두고 정화를 테스트로
지키는 편이 낫다고 판단했다.

부수 효과로 GFM(표, 취소선, 자동 링크)과 코드 블록 문법 강조가 따라온다.

## 범위

포함: 글 작성·수정 화면의 마크다운 에디터, 상세 화면의 마크다운 렌더링, HTML 정화,
기존 평문 글 호환.

제외: 이미지 삽입(백엔드에 업로드 API가 없다), 댓글 에디터(한 줄짜리 댓글에는 과하다),
백엔드 변경 일체.

## 아키텍처

### 새 의존성

| 패키지 | 이유 |
|---|---|
| `@uiw/react-md-editor` | 에디터 본체와 렌더러 |
| `rehype-sanitize` | 필수. 없으면 본문의 `<img onerror>`가 실행된다 |
| `remark-breaks` | 기존 글의 단일 개행을 줄바꿈으로 유지 |

### 새 파일

```
src/components/markdownPlugins.ts   remark/rehype 플러그인 배열 (단일 출처)
src/components/MarkdownEditor.tsx   작성·수정용 입력기
src/components/MarkdownView.tsx     상세 화면용 렌더러
```

### 수정할 파일

```
src/main.tsx                   라이브러리 CSS import
src/pages/PostWritePage.tsx    textarea → MarkdownEditor
src/pages/PostEditPage.tsx     textarea → MarkdownEditor
src/pages/PostDetailPage.tsx   본문 div → MarkdownView
```

## markdownPlugins.ts — 이 설계의 중심

에디터의 미리보기와 상세 화면이 각자 플러그인을 설정하면 반드시 어긋난다. 한쪽에만
`rehype-sanitize`가 빠지면 미리보기는 멀쩡한데 실제 글에서 XSS가 나고, `remark-breaks`가
빠지면 "미리보기와 다르게 나온다"는 버그가 난다.

플러그인 배열을 한 파일에 두고 두 컴포넌트가 import한다.

```ts
export const MARKDOWN_REMARK_PLUGINS = [remarkBreaks];
export const MARKDOWN_REHYPE_PLUGINS = [[rehypeSanitize]];
```

## MarkdownEditor

MDEditor의 얇은 래퍼다.

- `preview="edit"`로 시작한다. 미리보기는 툴바의 전환 버튼으로 연다(탭 전환 방식).
- 사이트에 다크모드가 없으므로 `data-color-mode="light"`로 감싼다.
- `textareaProps`로 `CONTENT_MAX`(100,000)를 건다. 백엔드 `@Size`와 같은 값이다.
- MDEditor의 `onChange`는 `string | undefined`를 넘긴다. `?? ''`로 정규화해서 부모에
  전달한다. 그러지 않으면 부모의 `content.trim()` 검증이 터진다.
- `previewOptions`에 공유 플러그인 배열을 넘긴다.

props는 `{ value: string; onChange: (value: string) => void }`다.

## MarkdownView

`MDEditor.Markdown`에 같은 플러그인을 물린 래퍼다. props는 `{ source: string }`.

상세 화면의 `<div className="leading-relaxed text-gray-800 whitespace-pre-wrap">{post.content}</div>`를
이것으로 교체한다.

## CSS

`main.tsx`에서 불러온다. Tailwind preflight가 라이브러리 스타일을 덮지 않도록
`index.css` **뒤에** 둔다.

```tsx
import './index.css';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
```

라이브러리 스타일은 `.wmde-markdown` 클래스 아래로 격리돼 있어 기존 Tailwind 화면을
건드리지 않는다.

## 기존 글 호환

이미 쓰인 평문 글은 대부분 그대로 보인다. 예외가 둘 있다.

**줄바꿈** — 마크다운은 단일 개행을 무시하는 것이 기본이다. 기존 글은 전부 `<textarea>`에서
엔터로 줄을 나눠 썼으므로, `remark-breaks` 없이는 글 전체가 한 문단으로 뭉개진다.

**줄 앞 기호** — 기존 글에 `- 항목`이나 `# 제목`처럼 쓴 부분이 있으면 이제 목록·제목으로
렌더된다. 대체로 의도와 맞으므로 그대로 둔다.

## 검색과의 관계

저장되는 것이 평문이므로 V9 FULLTEXT 인덱스는 그대로 동작한다. 본문에 `**`나 `##` 기호가
섞이지만 MySQL ngram 파서가 2글자 토큰으로 자르므로 `**스프링**`도 '스프링'으로 검색된다.

## 검증이 필요한 지점

`previewOptions`에 `remarkPlugins`/`rehypePlugins`를 넘길 때 라이브러리가 내부 기본
플러그인과 **병합하는지 덮어쓰는지** 문서에 명시돼 있지 않다. 덮어쓴다면 `remark-gfm`과
`rehype-prism-plus`가 빠져 표와 코드 하이라이팅이 사라진다.

구현 중 다음을 눈으로 확인한다:

1. GFM 표(`| a | b |`)가 표로 렌더되는가
2. 코드 블록(` ```js `)에 문법 강조가 남아 있는가

둘 중 하나라도 사라지면 `markdownPlugins.ts`의 배열에 `remarkGfm`과 `rehypePrismPlus`를
명시적으로 추가한다. 두 패키지는 이미 트리에 있으므로 설치는 필요 없다.

## 보안

`rehype-sanitize`의 기본 스키마(GitHub 기준)를 쓴다. 굵게·기울임·제목·목록·인용·코드
블록·링크는 모두 통과하고, `<script>`, `<iframe>`, `on*` 이벤트 속성, `javascript:` 링크는
제거된다. 이 기능 집합에 부족함이 없다.

프론트가 유일한 방어선이라는 점이 중요하다. 백엔드는 정화하지 않으므로 DB에는 악성
문자열이 그대로 저장될 수 있고, 그것을 무해하게 만드는 것은 렌더링 시점뿐이다.

이 방어를 테스트로 고정한다. 나중에 누가 플러그인 배열을 건드리면 테스트가 잡는다.

## 에러 처리

에디터 도입으로 새로 생기는 실패 경로는 없다. 기존 동작을 유지한다.

| 상황 | 처리 |
|---|---|
| 제목 또는 본문이 빈 값 | 기존과 동일하게 제출 전 `alert`로 막는다 |
| 본문이 100,000자 초과 | `textareaProps`의 `maxLength`가 입력 자체를 막는다 |
| 저장 API 실패 | 기존 `errorMessage()` 알림 그대로 |

## 테스트

기존 패턴(`vi.mock('../api/axios')`, `MemoryRouter`)을 따른다.

**`MarkdownView.test.tsx`**
- `## 제목`이 `<h2>`로 렌더된다
- 단일 개행이 줄바꿈으로 렌더된다 (기존 평문 글 호환)
- `<script>alert(1)</script>`가 실행 가능한 형태로 남지 않는다
- `<img src=x onerror=alert(1)>`의 `onerror` 속성이 제거된다
- `[링크](javascript:alert(1))`의 `javascript:` href가 제거된다

**`MarkdownEditor.test.tsx`**
- 전달한 `value`가 화면에 보인다
- 입력하면 `onChange`가 문자열로 호출된다 (`undefined`가 아님)

**알려진 위험** — MDEditor가 jsdom에서 바로 뜨지 않을 수 있다(`ResizeObserver` 등
미구현 API 사용). 그럴 경우 `src/test/setup.ts`에 해당 API 폴리필을 추가해서 해결한다.
테스트를 건너뛰거나 컴포넌트를 목으로 대체하지 않는다. 정화 테스트는 실제 렌더 결과로
확인해야 의미가 있다.

## 검증

1. `npm test` — 신규·기존 테스트 전부 그린
2. `npm run build` — `tsc -b` 통과
3. 백엔드를 띄우고 브라우저에서 확인
   - 글 작성 화면에서 툴바 버튼으로 굵게·목록·코드 블록이 삽입되는가
   - 미리보기 탭으로 전환하면 서식이 반영되는가
   - 저장 후 상세 화면이 미리보기와 같게 보이는가
   - 기존에 쓴 평문 글의 줄바꿈이 유지되는가
   - 본문에 `<img src=x onerror=alert(1)>`를 넣어 저장했을 때 알림이 뜨지 않는가
   - GFM 표와 코드 하이라이팅이 동작하는가

## 작업 순서

단위마다 작성 → 확인 → 테스트 → diff 리뷰 → 로컬 커밋을 반복한다. push는 요청이 있을 때만
한다.

1. 의존성 설치 + CSS import + `markdownPlugins.ts`
2. `MarkdownView` + 정화 테스트
3. `MarkdownEditor` + 테스트
4. 세 페이지에 적용
