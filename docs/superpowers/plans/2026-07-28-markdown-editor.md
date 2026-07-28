# 글 작성 마크다운 에디터 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 글 작성·수정 화면의 맨 `<textarea>`를 마크다운 에디터로 바꾸고, 상세 화면이 마크다운을 렌더한다.

**Architecture:** `@uiw/react-md-editor`를 쓰되 렌더러는 `MDEditor.Markdown` 하나로 통일한다. 미리보기와 상세 화면이 어긋나지 않도록 remark/rehype 플러그인 배열을 한 파일에 두고 양쪽이 공유한다. 저장되는 본문은 평문 마크다운이라 백엔드와 검색 인덱스는 손대지 않는다.

**Tech Stack:** React 19, TypeScript 5.9, @uiw/react-md-editor 4.1.1, rehype-sanitize, remark-breaks, Vitest 4 + Testing Library

## Global Constraints

- **백엔드는 절대 수정하지 않는다.** `C:\Users\wlqkr\IdeaProjects\posthub`는 읽기 전용이다.
- 작업 디렉터리는 `C:\Users\wlqkr\IdeaProjects\posthub-front`다.
- **`rehype-sanitize`는 필수다.** `@uiw/react-markdown-preview`가 `rehype-raw`를 직접 의존성으로 갖고 있어 raw HTML이 기본으로 렌더된다. 백엔드는 정화를 하지 않으므로 프론트가 유일한 방어선이다.
- **`remark-breaks`도 필수다.** 기존 글은 전부 `<textarea>`에서 엔터로 줄을 나눠 썼다. 없으면 기존 글 전체가 한 문단으로 뭉개진다.
- 플러그인 배열은 `src/components/markdownPlugins.ts` 한 곳에만 둔다. 컴포넌트가 각자 설정하면 미리보기와 실제 글이 어긋난다.
- 본문 길이 제한은 `CONTENT_MAX`(100,000). 백엔드 `PostFieldLimits.CONTENT_MAX`와 같은 값이어야 한다.
- 미리보기는 탭 전환 방식이다. `preview="edit"`로 시작한다.
- 사이트에 다크모드가 없다. `data-color-mode="light"`로 감싼다.
- 댓글은 평문 `<textarea>` 그대로 둔다. 이미지 삽입은 범위 밖이다(백엔드에 업로드 API가 없다).
- 커밋은 로컬에만 한다. `git push`는 하지 않는다.

## 파일 구조

**신규**

| 경로 | 책임 |
|---|---|
| `src/components/markdownPlugins.ts` | remark/rehype 플러그인 배열의 단일 출처 |
| `src/components/MarkdownView.tsx` | 마크다운 렌더링 (상세 화면용) |
| `src/components/MarkdownEditor.tsx` | 마크다운 입력 (작성·수정용) |

**수정**

| 경로 | 변경 |
|---|---|
| `src/main.tsx` | 라이브러리 CSS import 2줄 |
| `src/pages/PostDetailPage.tsx` | 본문 `<div>` → `MarkdownView` |
| `src/pages/PostWritePage.tsx` | `<textarea>` → `MarkdownEditor` |
| `src/pages/PostEditPage.tsx` | `<textarea>` → `MarkdownEditor` |

---

### Task 1: 의존성 설치와 플러그인 단일 출처

렌더링과 정화의 토대를 놓는다. 이 태스크가 끝나면 화면은 아직 그대로지만 두 컴포넌트가 쓸 설정이 준비된다.

**Files:**
- Create: `src/components/markdownPlugins.ts`
- Modify: `src/main.tsx` (4행 `import './index.css'` 뒤)
- Modify: `package.json` (설치로 자동 변경)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `MARKDOWN_REMARK_PLUGINS` — `MDEditor`의 `previewOptions.remarkPlugins`와 `MDEditor.Markdown`의 `remarkPlugins`에 그대로 넘기는 배열
  - `MARKDOWN_REHYPE_PLUGINS` — 같은 자리의 `rehypePlugins`에 넘기는 배열

- [ ] **Step 1: 패키지를 설치한다**

Run: `npm install @uiw/react-md-editor rehype-sanitize remark-breaks`
Expected: 설치 성공. peer dependency 경고가 없어야 한다(`@uiw/react-md-editor`의 peer는 `react >=16.8.0`이라 React 19와 맞는다).

- [ ] **Step 2: 설치 결과를 확인한다**

Run: `npm ls @uiw/react-md-editor rehype-sanitize remark-breaks`
Expected: 세 패키지가 모두 나오고 `UNMET DEPENDENCY`가 없다

- [ ] **Step 3: 플러그인 단일 출처 파일을 만든다**

`src/components/markdownPlugins.ts`:

```ts
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';

/**
 * 마크다운 렌더링 플러그인. 편집 화면의 미리보기와 상세 화면이 이 배열을 함께 쓴다.
 *
 * 두 곳이 각자 설정하면 반드시 어긋난다. 한쪽에만 정화가 빠지면 미리보기는
 * 멀쩡한데 실제 글에서 XSS가 나고, 줄바꿈 플러그인이 빠지면 '미리보기와
 * 다르게 나온다'는 버그가 난다.
 */

/**
 * 단일 개행을 줄바꿈으로 렌더한다.
 *
 * 마크다운 기본 규칙은 단일 개행을 무시한다. 기존 글은 전부 textarea에서
 * 엔터로 줄을 나눠 썼으므로, 이게 없으면 글 전체가 한 문단으로 뭉개진다.
 */
export const MARKDOWN_REMARK_PLUGINS = [remarkBreaks];

/**
 * 위험한 HTML을 제거한다.
 *
 * @uiw/react-markdown-preview가 rehype-raw를 직접 의존성으로 갖고 있어
 * raw HTML이 기본으로 렌더된다. 백엔드는 content를 정화하지 않으므로
 * DB에는 악성 문자열이 그대로 저장될 수 있고, 프론트가 유일한 방어선이다.
 */
export const MARKDOWN_REHYPE_PLUGINS = [[rehypeSanitize]];
```

- [ ] **Step 4: 라이브러리 CSS를 불러온다**

`src/main.tsx`의 `import './index.css'` 바로 뒤에 두 줄을 추가한다. Tailwind preflight가 라이브러리 스타일을 덮지 않도록 반드시 `index.css` **뒤**여야 한다:

```tsx
import './index.css'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'
```

- [ ] **Step 5: 기존 테스트와 빌드가 깨지지 않았는지 확인한다**

Run: `npm test`
Expected: PASS (기존 테스트 그대로)

Run: `npm run build`
Expected: 타입 오류 없이 성공

- [ ] **Step 6: diff를 검토하고 커밋한다**

Run: `git diff` 및 `git status`로 확인한 뒤:

```bash
git add package.json package-lock.json src/components/markdownPlugins.ts src/main.tsx
git commit -m "chore: 마크다운 에디터 의존성과 플러그인 설정"
```

---

### Task 2: MarkdownView와 정화

렌더러다. 정화가 실제로 동작하는지 테스트로 고정하는 것이 이 태스크의 핵심이다.

**Files:**
- Create: `src/components/MarkdownView.tsx`
- Create: `src/components/MarkdownView.test.tsx`
- Modify: `src/test/setup.ts` (Step 3에서 필요할 때만)

**Interfaces:**
- Consumes: `MARKDOWN_REMARK_PLUGINS`, `MARKDOWN_REHYPE_PLUGINS` (Task 1)
- Produces: `MarkdownView` 기본 export — props `{ source: string }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/MarkdownView.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarkdownView from './MarkdownView';

describe('MarkdownView', () => {
    it('마크다운 제목을 heading으로 렌더한다', () => {
        render(<MarkdownView source="## 들어가며" />);

        expect(screen.getByRole('heading', { name: '들어가며' })).toBeInTheDocument();
    });

    it('목록을 목록으로 렌더한다', () => {
        render(<MarkdownView source={'- 첫째\n- 둘째'} />);

        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('단일 개행을 줄바꿈으로 렌더한다', () => {
        // 기존 평문 글은 전부 엔터로 줄을 나눠 썼다.
        // remark-breaks가 빠지면 br이 없어 한 문단으로 뭉개진다.
        const { container } = render(<MarkdownView source={'첫째 줄\n둘째 줄'} />);

        expect(container.querySelector('br')).not.toBeNull();
    });

    it('script 태그를 제거한다', () => {
        const { container } = render(
            <MarkdownView source={'안녕<script>window.__xss = true;</script>'} />
        );

        expect(container.querySelector('script')).toBeNull();
    });

    it('onerror 같은 이벤트 속성을 제거한다', () => {
        const { container } = render(
            <MarkdownView source={'<img src="x" onerror="window.__xss = true">'} />
        );

        const img = container.querySelector('img');
        expect(img?.getAttribute('onerror')).toBeNull();
    });

    it('javascript: 링크를 제거한다', () => {
        const { container } = render(
            <MarkdownView source={'[누르지 마세요](javascript:window.__xss = true)'} />
        );

        const link = container.querySelector('a');
        expect(link?.getAttribute('href') ?? '').not.toContain('javascript:');
    });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- MarkdownView`
Expected: FAIL — `Failed to resolve import "./MarkdownView"`

- [ ] **Step 3: MarkdownView를 구현한다**

`src/components/MarkdownView.tsx`:

```tsx
import MDEditor from '@uiw/react-md-editor';
import { MARKDOWN_REHYPE_PLUGINS, MARKDOWN_REMARK_PLUGINS } from './markdownPlugins';

interface MarkdownViewProps {
    source: string;
}

/**
 * 저장된 마크다운 본문을 화면에 그린다.
 *
 * 편집 화면의 미리보기와 같은 렌더러·같은 플러그인을 쓴다.
 * 그래야 '미리보기에선 이랬는데 저장하니 다르다'가 생기지 않는다.
 */
const MarkdownView = ({ source }: MarkdownViewProps) => (
    <MDEditor.Markdown
        source={source}
        remarkPlugins={MARKDOWN_REMARK_PLUGINS}
        rehypePlugins={MARKDOWN_REHYPE_PLUGINS}
    />
);

export default MarkdownView;
```

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- MarkdownView`
Expected: PASS (6개)

만약 jsdom에 없는 브라우저 API(`ResizeObserver`, `matchMedia` 등) 때문에 렌더가 터지면, `src/test/setup.ts`에 폴리필을 추가해 해결한다. 예를 들어 `ResizeObserver`가 없다는 오류가 나면:

```ts
// jsdom에는 ResizeObserver가 없다. 마크다운 렌더러가 이걸 참조한다.
globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
```

**테스트를 건너뛰거나 컴포넌트를 목으로 대체하지 않는다.** 정화 테스트는 실제 렌더 결과로 확인해야 의미가 있다.

- [ ] **Step 5: 상세 화면이 MarkdownView를 쓰도록 바꾼다**

`src/pages/PostDetailPage.tsx` import에 추가한다:

```tsx
import MarkdownView from '../components/MarkdownView';
```

본문을 그리는 줄을 바꾼다. 기존:

```tsx
<div className="leading-relaxed text-gray-800 whitespace-pre-wrap">
    {post.content}
</div>
```

변경 후:

```tsx
<div className="leading-relaxed text-gray-800">
    <MarkdownView source={post.content} />
</div>
```

`whitespace-pre-wrap`을 지우는 이유: 줄바꿈은 이제 `remark-breaks`가 `<br>`로 만든다. 둘 다 두면 마크다운이 만든 문단 여백에 원본 공백까지 겹쳐 간격이 벌어진다.

- [ ] **Step 6: 전체 테스트와 타입 검사를 돌린다**

Run: `npm test`
Expected: PASS (기존 + MarkdownView 6개)

Run: `npm run build`
Expected: 타입 오류 없이 성공

- [ ] **Step 7: diff를 검토하고 커밋한다**

```bash
git add src/components/MarkdownView.tsx src/components/MarkdownView.test.tsx src/pages/PostDetailPage.tsx
git commit -m "feat: 게시글 본문을 마크다운으로 렌더"
```

(`src/test/setup.ts`를 고쳤다면 `git add`에 함께 넣는다.)

---

### Task 3: MarkdownEditor

입력기다. MDEditor의 `onChange`가 `undefined`를 줄 수 있다는 점이 유일한 함정이다.

**Files:**
- Create: `src/components/MarkdownEditor.tsx`
- Create: `src/components/MarkdownEditor.test.tsx`

**Interfaces:**
- Consumes: `MARKDOWN_REMARK_PLUGINS`, `MARKDOWN_REHYPE_PLUGINS` (Task 1), `CONTENT_MAX` (`src/constants/postLimits.ts`, 기존 파일)
- Produces: `MarkdownEditor` 기본 export — props `{ value: string; onChange: (value: string) => void }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/MarkdownEditor.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MarkdownEditor from './MarkdownEditor';

describe('MarkdownEditor', () => {
    it('전달한 값을 입력창에 보여준다', () => {
        render(<MarkdownEditor value="## 제목" onChange={vi.fn()} />);

        expect(screen.getByRole('textbox')).toHaveValue('## 제목');
    });

    it('입력하면 onChange를 문자열로 호출한다', async () => {
        const onChange = vi.fn();
        render(<MarkdownEditor value="" onChange={onChange} />);

        await userEvent.type(screen.getByRole('textbox'), '가');

        expect(onChange).toHaveBeenCalledWith('가');
    });

    it('본문 길이 제한을 입력창에 건다', () => {
        render(<MarkdownEditor value="" onChange={vi.fn()} />);

        expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '100000');
    });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- MarkdownEditor`
Expected: FAIL — `Failed to resolve import "./MarkdownEditor"`

- [ ] **Step 3: MarkdownEditor를 구현한다**

`src/components/MarkdownEditor.tsx`:

```tsx
import MDEditor from '@uiw/react-md-editor';
import { CONTENT_MAX } from '../constants/postLimits';
import { MARKDOWN_REHYPE_PLUGINS, MARKDOWN_REMARK_PLUGINS } from './markdownPlugins';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
}

/**
 * 글 작성·수정용 마크다운 입력기.
 *
 * preview="edit"로 시작해 툴바의 전환 버튼으로 미리보기를 연다(탭 전환).
 * 사이트에 다크모드가 없어 data-color-mode는 light로 고정한다.
 */
const MarkdownEditor = ({ value, onChange }: MarkdownEditorProps) => (
    <div data-color-mode="light">
        <MDEditor
            value={value}
            // MDEditor는 string | undefined를 넘긴다. 그대로 올리면
            // 부모의 content.trim() 검증이 터진다.
            onChange={(next) => onChange(next ?? '')}
            preview="edit"
            height={400}
            textareaProps={{
                placeholder: '내용을 입력하세요',
                maxLength: CONTENT_MAX,
            }}
            previewOptions={{
                remarkPlugins: MARKDOWN_REMARK_PLUGINS,
                rehypePlugins: MARKDOWN_REHYPE_PLUGINS,
            }}
        />
    </div>
);

export default MarkdownEditor;
```

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- MarkdownEditor`
Expected: PASS (3개)

- [ ] **Step 5: 전체 테스트와 타입 검사를 돌린다**

Run: `npm test`
Expected: PASS (기존 + MarkdownView 6개 + MarkdownEditor 3개)

Run: `npm run build`
Expected: 타입 오류 없이 성공

- [ ] **Step 6: diff를 검토하고 커밋한다**

```bash
git add src/components/MarkdownEditor.tsx src/components/MarkdownEditor.test.tsx
git commit -m "feat: 마크다운 입력 컴포넌트"
```

---

### Task 4: 작성·수정 화면에 적용

두 페이지의 `<textarea>`를 교체한다. 나머지 제출 로직은 그대로 둔다.

**Files:**
- Modify: `src/pages/PostWritePage.tsx` (70-81행 내용 입력 영역)
- Modify: `src/pages/PostEditPage.tsx` (80-89행 내용 입력 영역)

**Interfaces:**
- Consumes: `MarkdownEditor` (Task 3)
- Produces: 없음 (화면 적용)

- [ ] **Step 1: PostWritePage를 바꾼다**

import에 추가한다:

```tsx
import MarkdownEditor from '../components/MarkdownEditor';
```

`CONTENT_MAX`는 이제 `MarkdownEditor`가 쓰므로 이 파일에서는 필요 없다. import를 줄인다:

```tsx
import { TITLE_MAX } from '../constants/postLimits';
```

내용 입력 영역을 통째로 바꾼다. 기존:

```tsx
<div className="mb-6">
    <label className="block mb-2 text-sm font-bold text-gray-700">내용</label>
    <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요"
        maxLength={CONTENT_MAX}
        rows={10} // 높이를 넉넉하게 설정
        className="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow-appearance-none focus:outline-none focus:shadow-outline resize-none"
    />
</div>
```

변경 후:

```tsx
<div className="mb-6">
    <label className="block mb-2 text-sm font-bold text-gray-700">내용</label>
    <MarkdownEditor value={content} onChange={setContent} />
</div>
```

- [ ] **Step 2: PostEditPage를 바꾼다**

import에 추가한다:

```tsx
import MarkdownEditor from '../components/MarkdownEditor';
```

`CONTENT_MAX` import를 줄인다:

```tsx
import { TITLE_MAX } from '../constants/postLimits';
```

내용 입력 영역을 통째로 바꾼다. 기존:

```tsx
<div className="mb-6">
    <label className="block mb-2 text-sm font-bold text-gray-700">내용</label>
    <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={CONTENT_MAX}
        rows={10}
        className="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow-appearance-none focus:outline-none focus:shadow-outline resize-none"
    />
</div>
```

변경 후:

```tsx
<div className="mb-6">
    <label className="block mb-2 text-sm font-bold text-gray-700">내용</label>
    <MarkdownEditor value={content} onChange={setContent} />
</div>
```

`PostEditPage`의 `content` 상태는 `useState(existingPost?.content || '')`로 초기화되고 서버 재조회 시 `setContent(response.data.content)`로 채워진다. 둘 다 문자열이므로 `MarkdownEditor`의 `value: string`과 맞는다. 이 로직은 건드리지 않는다.

- [ ] **Step 3: 전체 테스트와 타입 검사를 돌린다**

Run: `npm test`
Expected: PASS (변동 없음)

Run: `npm run build`
Expected: 타입 오류 없이 성공. `CONTENT_MAX`를 지웠는데 남은 참조가 있으면 여기서 잡힌다.

- [ ] **Step 4: diff를 검토하고 커밋한다**

```bash
git add src/pages/PostWritePage.tsx src/pages/PostEditPage.tsx
git commit -m "feat: 글 작성·수정에 마크다운 에디터 적용"
```

---

## 최종 검증 (브라우저)

테스트만으로는 라이브러리의 실제 동작을 확인할 수 없다. 특히 플러그인 병합 여부는 눈으로 봐야 한다.

- [ ] **Step 1: 백엔드를 띄운다**

MySQL 8.0.44와 Redis 3.0.504가 실행 중인지 확인한 뒤, `C:\Users\wlqkr\IdeaProjects\posthub`에서:

Run: `./gradlew bootRun`
Expected: `posthub` DB에 붙어 기동 (개발용 DB이므로 절대 비우지 않는다)

- [ ] **Step 2: 프론트를 띄운다**

`C:\Users\wlqkr\IdeaProjects\posthub-front`에서:

Run: `npm run dev`

- [ ] **Step 3: 플러그인 병합 여부를 확인한다 (가장 중요)**

`previewOptions`에 플러그인 배열을 넘길 때 라이브러리가 내부 기본값과 병합하는지 덮어쓰는지 문서에 명시돼 있지 않다. 덮어쓴다면 `remark-gfm`과 `rehype-prism-plus`가 빠져 표와 코드 하이라이팅이 조용히 사라진다.

글 작성 화면에서 다음을 입력하고 미리보기 탭으로 확인한다:

````markdown
| 이름 | 값 |
| --- | --- |
| 가 | 1 |

```js
const x = 1;
```
````

Expected: 표가 표로 렌더되고, 코드 블록에 문법 강조 색이 보인다.

**둘 중 하나라도 사라졌다면** `src/components/markdownPlugins.ts`의 배열에 명시적으로 추가한다. 두 패키지는 `@uiw/react-markdown-preview`의 의존성으로 이미 트리에 있어 설치가 필요 없다:

```ts
import rehypePrismPlus from 'rehype-prism-plus';
import remarkGfm from 'remark-gfm';

export const MARKDOWN_REMARK_PLUGINS = [remarkBreaks, remarkGfm];
export const MARKDOWN_REHYPE_PLUGINS = [[rehypeSanitize], [rehypePrismPlus]];
```

추가했다면 `npm test`와 `npm run build`를 다시 돌리고 별도 커밋한다.

- [ ] **Step 4: 에디터 동작을 확인한다**

1. 툴바의 굵게·목록·코드 블록 버튼을 눌러 기호가 삽입되는지
2. 미리보기 탭으로 전환하면 서식이 반영되는지
3. 작성 완료 후 상세 화면이 미리보기와 같게 보이는지

- [ ] **Step 5: 기존 글 호환을 확인한다**

에디터 도입 전에 쓴 글(개발용 `posthub` DB에 있는 기존 글)을 연다.

Expected: 줄바꿈이 그대로 유지된다. 한 문단으로 뭉개졌다면 `remark-breaks`가 적용되지 않은 것이다.

- [ ] **Step 6: 정화를 확인한다**

글 본문에 다음을 넣어 저장한 뒤 상세 화면을 연다:

```
<img src=x onerror="alert('xss')">
```

Expected: 알림창이 뜨지 않는다. 뜬다면 `rehype-sanitize`가 적용되지 않은 것이므로 즉시 원인을 찾는다.

- [ ] **Step 7: 수정 화면을 확인한다**

마크다운으로 쓴 글에서 수정 버튼을 누른다.

Expected: 에디터에 마크다운 원문이 그대로 들어가 있고, 수정 후 저장하면 반영된다.

---

## 자기 검토 결과

**스펙 커버리지** — 스펙의 각 항목이 어느 태스크에 있는지:

| 스펙 항목 | 태스크 |
|---|---|
| 의존성 3개 설치 | Task 1 Step 1 |
| CSS를 index.css 뒤에 import | Task 1 Step 4 |
| `markdownPlugins.ts` 단일 출처 | Task 1 Step 3 |
| `MarkdownView` (상세 화면) | Task 2 |
| `MarkdownEditor` (`preview="edit"`, `data-color-mode`, `CONTENT_MAX`, `?? ''`) | Task 3 Step 3 |
| 세 페이지 적용 | Task 2 Step 5, Task 4 |
| 기존 글 줄바꿈 호환 | Task 2 Step 1(테스트), 최종 검증 Step 5 |
| 정화 (script/onerror/javascript:) | Task 2 Step 1(테스트 3개), 최종 검증 Step 6 |
| 플러그인 병합 여부 검증 | 최종 검증 Step 3 (대응 코드까지 포함) |
| jsdom 폴리필 대응 | Task 2 Step 4 |
| 댓글·이미지 제외 | Global Constraints |
| 백엔드 미수정 | Global Constraints |
| 검색 인덱스 영향 없음 | 저장 형식이 평문이라 코드 변경 없음 — 태스크 불필요 |

빠진 항목 없음.

**플레이스홀더** — TBD/TODO/"적절히 처리" 없음. jsdom 폴리필과 플러그인 병합 대응은 조건부지만 둘 다 판단 기준과 실제 코드가 함께 적혀 있다.

**타입 일관성** — `MARKDOWN_REMARK_PLUGINS`/`MARKDOWN_REHYPE_PLUGINS`(Task 1)를 Task 2와 Task 3이 같은 이름으로 쓴다. `MarkdownView`의 prop은 `source`, `MarkdownEditor`의 prop은 `value`/`onChange`로 각 태스크에서 일관된다. `CONTENT_MAX`는 기존 `src/constants/postLimits.ts`의 실제 export 이름이다.

## 좋아요·검색 계획과의 관계

`2026-07-28-front-likes-search.md`와 이 계획은 `src/pages/PostDetailPage.tsx`를 공통으로 건드린다. 다만 겹치는 줄은 없다 — 이 계획은 본문 렌더링 부분을, 좋아요·검색 계획은 본문 아래 좋아요 버튼과 댓글 영역을 바꾼다.

그래도 **한 번에 하나씩 끝내는 것을 권한다.** 두 계획을 섞어 실행하면 어느 쪽 변경이 무엇을 깨뜨렸는지 판단하기 어려워진다.
