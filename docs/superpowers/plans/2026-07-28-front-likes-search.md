# 프론트엔드 좋아요·검색 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 백엔드에 이미 있는 게시글/댓글 좋아요와 게시글 검색을 프론트엔드에 붙인다.

**Architecture:** `useLike` 훅이 좋아요 상태와 API 호출을 소유하고 `LikeButton`이 이를 감싸 페이지에서는 한 줄로 쓴다. 검색은 `/search` 라우트에서 URL 쿼리스트링을 상태로 삼는다. 목록 테이블과 페이징은 컴포넌트로 추출해 게시판·검색 두 화면이 공유한다.

**Tech Stack:** React 19, TypeScript 5.9, react-router-dom 7, axios 1.13, Tailwind 3.4, Vitest 4 + Testing Library

## Global Constraints

- **백엔드는 절대 수정하지 않는다.** `C:\Users\wlqkr\IdeaProjects\posthub`는 이번 작업에서 읽기 전용이다.
- 작업 디렉터리는 `C:\Users\wlqkr\IdeaProjects\posthub-front`다.
- 검색어 길이 제한은 백엔드 `SearchQuery`와 같은 값이어야 한다: 최소 2자, 최대 100자.
- 목록 응답(`PostListResponse`)에는 `likeCount`가 **없다**. 목록·검색 테이블에 좋아요 수를 넣지 않는다.
- 한 페이지 크기는 10이다. 백엔드가 50을 넘는 `size`를 잘라내므로 그 아래로만 요청한다.
- `sort` 파라미터는 백엔드가 무시한다. 보내지 않는다.
- 좋아요 API 호출 전 `localStorage.getItem('accessToken')`을 반드시 먼저 확인한다. 401이 나면 `src/api/axios.ts`의 인터셉터가 비로그인 사용자에게 "로그인 세션이 만료되었습니다"를 띄운다.
- 테스트는 `vi.mock('../api/axios')`로 axios를 모킹하고 `MemoryRouter`로 감싼다. 기존 `src/pages/BoardPage.test.tsx`가 이 패턴의 기준이다.
- jsdom에는 `window.alert`가 없다. 클릭이 `alert`에 닿는 테스트는 `vi.stubGlobal('alert', vi.fn())`을 먼저 호출해야 한다.
- 커밋은 로컬에만 한다. `git push`는 하지 않는다.

## 파일 구조

**신규**

| 경로 | 책임 |
|---|---|
| `src/types/page.ts` | Spring Boot 4 `Page` 응답 형식 |
| `src/types/post.ts` | 목록 응답 한 건(`PostSummary`) |
| `src/constants/pagination.ts` | 페이지 크기, 페이지 버튼 윈도우 크기 |
| `src/constants/searchLimits.ts` | 검색어 길이 제한 |
| `src/components/PostTable.tsx` | 글 목록 테이블 |
| `src/components/Pagination.tsx` | 페이지 버튼 |
| `src/components/LikeButton.tsx` | 좋아요 버튼 |
| `src/components/SearchBox.tsx` | 검색 입력 |
| `src/hooks/useLike.ts` | 좋아요 상태·API·에러 |
| `src/pages/SearchPage.tsx` | 검색 결과 화면 |

**수정**

| 경로 | 변경 |
|---|---|
| `src/pages/BoardPage.tsx` | 타입·테이블·페이징을 추출한 것으로 교체, 검색창 추가 |
| `src/pages/BoardPage.test.tsx` | 픽스처를 `PostSummary` 형태로 갱신 |
| `src/pages/PostDetailPage.tsx` | 타입에 좋아요 필드 추가, 버튼 2군데 |
| `src/App.tsx` | `/search` 라우트 |

---

### Task 1: 목록 타입과 PostTable 추출

`PostTable`은 BoardPage의 테이블 마크업을 그대로 옮기되 댓글 수 열을 추가한다. `commentsSize`는 백엔드가 이미 내려주는데 화면이 쓰지 않던 값이다.

**Files:**
- Create: `src/types/page.ts`
- Create: `src/types/post.ts`
- Create: `src/components/PostTable.tsx`
- Create: `src/components/PostTable.test.tsx`
- Modify: `src/pages/BoardPage.tsx` (12-41행 타입 정의, 247-291행 테이블)
- Modify: `src/pages/BoardPage.test.tsx` (28-36행 픽스처)

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `PageResponse<T>` — `{ content: T[]; page?: { size: number; number: number; totalElements: number; totalPages: number } }`
  - `PostSummary` — `{ id: number; title: string; viewCount: number; createdAt: string; userId: number; nickname: string; commentsSize: number }`
  - `PostTable` 기본 export — props `{ posts: PostSummary[]; emptyMessage: string; onRowClick: (postId: number) => void }`

- [ ] **Step 1: 타입 파일 두 개를 만든다**

`src/types/page.ts`:

```ts
/**
 * Spring Boot 4의 Page 직렬화 형식.
 *
 * Boot 3까지는 totalPages/totalElements가 응답 루트에 있었지만
 * Boot 4는 page 객체 안으로 들어갔다. 루트에서 읽으면 undefined가 되고,
 * totalPages > 0 조건이 false가 되면서 페이징 버튼이 통째로 사라진다.
 */
export interface PageResponse<T> {
    content: T[];
    page?: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}
```

`src/types/post.ts`:

```ts
/**
 * 백엔드 PostListResponse 한 건. 게시판 목록과 검색 결과가 공유한다.
 *
 * 필드명이 백엔드와 정확히 일치해야 한다(userName 아님).
 * 탈퇴한 회원의 글은 nickname이 '탈퇴한 사용자'로 내려온다.
 * 본문(content)과 좋아요 수(likeCount)는 목록 응답에 없다.
 */
export interface PostSummary {
    id: number;
    title: string;
    viewCount: number;
    createdAt: string;
    userId: number;
    nickname: string;
    commentsSize: number;
}
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`src/components/PostTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PostTable from './PostTable';
import type { PostSummary } from '../types/post';

const post = (overrides: Partial<PostSummary> = {}): PostSummary => ({
    id: 1,
    title: '게시글 제목',
    viewCount: 5,
    createdAt: '2026-07-24T10:00:00',
    userId: 1,
    nickname: '작성자',
    commentsSize: 3,
    ...overrides,
});

describe('PostTable', () => {
    it('댓글 수를 보여준다', () => {
        render(<PostTable posts={[post()]} emptyMessage="없음" onRowClick={vi.fn()} />);

        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('글이 없으면 전달받은 문구를 보여준다', () => {
        render(<PostTable posts={[]} emptyMessage="검색 결과가 없습니다." onRowClick={vi.fn()} />);

        expect(screen.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
    });

    it('제목이 20자를 넘으면 잘라서 보여주되 전체 제목은 title 속성에 남긴다', () => {
        const longTitle = '가'.repeat(25);
        render(<PostTable posts={[post({ title: longTitle })]} emptyMessage="없음" onRowClick={vi.fn()} />);

        const cell = screen.getByTitle(longTitle);
        expect(cell).toHaveTextContent(`${'가'.repeat(20)}...`);
    });

    it('행을 클릭하면 글 id를 넘긴다', async () => {
        const onRowClick = vi.fn();
        render(<PostTable posts={[post({ id: 42 })]} emptyMessage="없음" onRowClick={onRowClick} />);

        await userEvent.click(screen.getByText('게시글 제목'));

        expect(onRowClick).toHaveBeenCalledWith(42);
    });
});
```

- [ ] **Step 3: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- PostTable`
Expected: FAIL — `Failed to resolve import "./PostTable"`

- [ ] **Step 4: PostTable을 구현한다**

`src/components/PostTable.tsx`:

```tsx
import type { PostSummary } from '../types/post';

interface PostTableProps {
    posts: PostSummary[];
    /** 글이 없을 때 보여줄 문구. 게시판 목록과 검색 결과가 다르다. */
    emptyMessage: string;
    onRowClick: (postId: number) => void;
}

/** 목록에서 보여줄 제목 최대 길이. 넘으면 자르고 전체는 title 속성에 남긴다. */
const TITLE_DISPLAY_MAX = 20;

const headerClass = 'px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase';
const cellClass = 'px-6 py-4 text-center text-gray-500 whitespace-nowrap';

const PostTable = ({ posts, emptyMessage, onRowClick }: PostTableProps) => (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
            <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">제목</th>
                <th className={headerClass}>작성자</th>
                <th className={headerClass}>작성일</th>
                <th className={headerClass}>조회수</th>
                <th className={headerClass}>댓글</th>
            </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {posts.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">{emptyMessage}</td>
                </tr>
            ) : (
                posts.map((post) => (
                    <tr
                        key={post.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => onRowClick(post.id)}
                    >
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium text-gray-900" title={post.title}>
                                {post.title.length > TITLE_DISPLAY_MAX
                                    ? post.title.substring(0, TITLE_DISPLAY_MAX) + '...'
                                    : post.title}
                            </span>
                        </td>
                        <td className={cellClass}>{post.nickname}</td>
                        <td className={cellClass}>
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className={cellClass}>{post.viewCount}</td>
                        <td className={cellClass}>{post.commentsSize}</td>
                    </tr>
                ))
            )}
            </tbody>
        </table>
    </div>
);

export default PostTable;
```

- [ ] **Step 5: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- PostTable`
Expected: PASS (4개)

- [ ] **Step 6: BoardPage가 PostTable을 쓰도록 바꾼다**

`src/pages/BoardPage.tsx`에서:

1. 12-38행의 `interface Post`와 `interface PageResponse<T>` 정의를 지운다.
2. import에 다음을 추가한다:

```tsx
import PostTable from '../components/PostTable';
import type { PostSummary } from '../types/post';
import type { PageResponse } from '../types/page';
```

3. `const [posts, setPosts] = useState<Post[]>([]);`를 다음으로 바꾼다:

```tsx
const [posts, setPosts] = useState<PostSummary[]>([]);
```

4. `api.get<PageResponse<Post>>(...)`를 `api.get<PageResponse<PostSummary>>(...)`로 바꾼다.
5. 247-291행의 `<div className="overflow-hidden ...">` ~ `</div>` 테이블 블록 전체를 다음으로 바꾼다:

```tsx
<PostTable
    posts={posts}
    emptyMessage="작성된 게시글이 없습니다."
    onRowClick={(postId) => navigate(`/posts/${postId}`)}
/>
```

- [ ] **Step 7: BoardPage 테스트 픽스처를 갱신한다**

`src/pages/BoardPage.test.tsx`의 `makePosts`(28-36행)를 다음으로 바꾼다. `content`는 백엔드 목록 응답에 없는 필드였고, `userId`와 `commentsSize`가 빠져 있었다:

```tsx
const makePosts = (count: number, startId: number) =>
    Array.from({ length: count }, (_, i) => ({
        id: startId + i,
        title: `게시글 ${startId + i}`,
        viewCount: 0,
        createdAt: '2026-07-24T10:00:00',
        userId: 1,
        nickname: '작성자',
        commentsSize: 0,
    }));
```

- [ ] **Step 8: 전체 테스트와 타입 검사를 돌린다**

Run: `npm test`
Expected: PASS — 기존 BoardPage 4개 + PostTable 4개

Run: `npm run build`
Expected: 타입 오류 없이 성공

- [ ] **Step 9: diff를 검토하고 커밋한다**

Run: `git diff` 및 `git status`로 변경 내용을 확인한 뒤:

```bash
git add src/types/page.ts src/types/post.ts src/components/PostTable.tsx src/components/PostTable.test.tsx src/pages/BoardPage.tsx src/pages/BoardPage.test.tsx
git commit -m "refactor: 글 목록 테이블을 PostTable로 추출하고 댓글 수 노출"
```

---

### Task 2: Pagination 추출과 버튼 수 제한

현재 페이징은 `Array.from({ length: totalPages })`로 모든 페이지 버튼을 그린다. 게시판 하나에서는 문제가 없었지만 검색은 전체 게시판이 대상이라 결과가 수백 페이지면 버튼이 수백 개 깔린다.

**Files:**
- Create: `src/constants/pagination.ts`
- Create: `src/components/Pagination.tsx`
- Create: `src/components/Pagination.test.tsx`
- Modify: `src/pages/BoardPage.tsx` (41행 `PAGE_SIZE` 상수, 293-327행 페이징 블록)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `PAGE_SIZE` = 10, `PAGE_WINDOW_SIZE` = 5 (`src/constants/pagination.ts`)
  - `Pagination` 기본 export — props `{ currentPage: number; totalPages: number; onChange: (page: number) => void }`

- [ ] **Step 1: 상수 파일을 만든다**

`src/constants/pagination.ts`:

```ts
/**
 * 페이징 설정.
 *
 * 백엔드는 size가 50을 넘으면 잘라내므로 그 아래에서 정한다.
 * 정렬은 백엔드가 최신순으로 고정하고 있어 sort는 보내지 않는다.
 */

/** 한 페이지에 보여줄 글 수 */
export const PAGE_SIZE = 10;

/** 한 번에 보여줄 페이지 번호 버튼 수. 검색 결과가 수백 페이지여도 이 개수를 넘지 않는다. */
export const PAGE_WINDOW_SIZE = 5;
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`src/components/Pagination.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination';

describe('Pagination', () => {
    it('페이지가 많아도 번호 버튼은 5개만 그린다', () => {
        render(<Pagination currentPage={0} totalPages={30} onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '6' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument();
    });

    it('현재 페이지가 중간이면 그 주변 번호를 보여준다', () => {
        render(<Pagination currentPage={10} totalPages={30} onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '13' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
    });

    it('마지막 페이지 근처면 윈도우가 끝에 붙는다', () => {
        render(<Pagination currentPage={29} totalPages={30} onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: '26' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '30' })).toBeInTheDocument();
    });

    it('전체가 한 페이지면 번호 버튼은 1개다', () => {
        render(<Pagination currentPage={0} totalPages={1} onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument();
    });

    it('페이지가 없으면 아무것도 그리지 않는다', () => {
        const { container } = render(<Pagination currentPage={0} totalPages={0} onChange={vi.fn()} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('번호를 누르면 0부터 세는 페이지 번호를 넘긴다', async () => {
        const onChange = vi.fn();
        render(<Pagination currentPage={0} totalPages={30} onChange={onChange} />);

        await userEvent.click(screen.getByRole('button', { name: '3' }));

        expect(onChange).toHaveBeenCalledWith(2);
    });
});
```

- [ ] **Step 3: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- Pagination`
Expected: FAIL — `Failed to resolve import "./Pagination"`

- [ ] **Step 4: Pagination을 구현한다**

`src/components/Pagination.tsx`:

```tsx
import { PAGE_WINDOW_SIZE } from '../constants/pagination';

interface PaginationProps {
    /** 0부터 세는 현재 페이지 (스프링과 같은 기준) */
    currentPage: number;
    totalPages: number;
    onChange: (page: number) => void;
}

/**
 * 현재 페이지를 중심으로 보여줄 페이지 번호를 고른다.
 * 양 끝에서는 윈도우가 밖으로 나가지 않도록 안쪽으로 붙인다.
 */
const visiblePages = (currentPage: number, totalPages: number): number[] => {
    const size = Math.min(PAGE_WINDOW_SIZE, totalPages);
    const half = Math.floor(PAGE_WINDOW_SIZE / 2);
    const start = Math.max(0, Math.min(currentPage - half, totalPages - size));

    return Array.from({ length: size }, (_, i) => start + i);
};

const Pagination = ({ currentPage, totalPages, onChange }: PaginationProps) => {
    if (totalPages <= 0) return null;

    return (
        <div className="flex items-center justify-center p-4 bg-white border-t border-gray-200 space-x-2">
            <button
                onClick={() => onChange(Math.max(currentPage - 1, 0))}
                disabled={currentPage === 0}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                이전
            </button>

            {visiblePages(currentPage, totalPages).map((page) => (
                <button
                    key={page}
                    onClick={() => onChange(page)}
                    className={`px-3 py-1 text-sm font-medium border rounded-md ${
                        currentPage === page
                            ? 'bg-blue-50 text-blue-600 border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    {page + 1}
                </button>
            ))}

            <button
                onClick={() => onChange(Math.min(currentPage + 1, totalPages - 1))}
                disabled={currentPage === totalPages - 1}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                다음
            </button>
        </div>
    );
};

export default Pagination;
```

- [ ] **Step 5: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- Pagination`
Expected: PASS (6개)

- [ ] **Step 6: BoardPage가 Pagination을 쓰도록 바꾼다**

`src/pages/BoardPage.tsx`에서:

1. 40-41행의 `PAGE_SIZE` 상수 선언(주석 포함)을 지우고 import를 추가한다:

```tsx
import Pagination from '../components/Pagination';
import { PAGE_SIZE } from '../constants/pagination';
```

2. 293-327행의 `{totalPages > 0 && ( ... )}` 페이징 블록 전체를 다음으로 바꾼다:

```tsx
<Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
```

- [ ] **Step 7: 전체 테스트와 타입 검사를 돌린다**

Run: `npm test`
Expected: PASS — BoardPage 4개 + PostTable 4개 + Pagination 6개

Run: `npm run build`
Expected: 타입 오류 없이 성공

- [ ] **Step 8: diff를 검토하고 커밋한다**

```bash
git add src/constants/pagination.ts src/components/Pagination.tsx src/components/Pagination.test.tsx src/pages/BoardPage.tsx
git commit -m "refactor: 페이징을 Pagination으로 추출하고 버튼 수를 5개로 제한"
```

---

### Task 3: useLike 훅과 LikeButton

좋아요의 모든 로직이 여기 모인다. 비로그인 차단이 이 태스크의 가장 중요한 동작이다.

**Files:**
- Create: `src/hooks/useLike.ts`
- Create: `src/components/LikeButton.tsx`
- Create: `src/components/LikeButton.test.tsx`

**Interfaces:**
- Consumes: `api`, `errorMessage` from `src/api/axios.ts`
- Produces:
  - `LikeTarget` = `'posts' | 'comments'`
  - `LikeState` = `{ liked: boolean; count: number }`
  - `useLike(target: LikeTarget, id: number, initial: LikeState)` → `{ liked: boolean; count: number; pending: boolean; toggle: () => Promise<void> }`
  - `LikeButton` 기본 export — props `{ target: LikeTarget; id: number; initial: LikeState; size?: 'sm' | 'md' }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/LikeButton.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LikeButton from './LikeButton';
import type { LikeState } from '../hooks/useLike';

vi.mock('../api/axios', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    errorMessage: (_e: unknown, fallback: string) => fallback,
}));

const api = (await import('../api/axios')).default as unknown as {
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

const renderButton = (initial: LikeState = { liked: false, count: 3 }) =>
    render(<LikeButton target="posts" id={7} initial={initial} />, { wrapper: MemoryRouter });

const likeButton = () => screen.getByRole('button', { name: '좋아요' });

describe('LikeButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        // jsdom에는 alert가 없어서 스텁이 없으면 클릭이 예외로 터진다.
        vi.stubGlobal('alert', vi.fn());
    });

    it('비로그인 상태에서 클릭하면 API를 부르지 않는다', async () => {
        renderButton();

        await userEvent.click(likeButton());

        expect(api.post).not.toHaveBeenCalled();
        expect(api.delete).not.toHaveBeenCalled();
    });

    it('로그인 상태에서 누르면 좋아요를 보내고 응답의 숫자를 반영한다', async () => {
        localStorage.setItem('accessToken', 'test-token');
        api.post.mockResolvedValue({ data: { liked: true, likeCount: 4 } });

        renderButton();
        await userEvent.click(likeButton());

        expect(api.post).toHaveBeenCalledWith('/posts/7/likes');
        expect(await screen.findByText('4')).toBeInTheDocument();
    });

    it('이미 누른 상태에서 클릭하면 취소를 보낸다', async () => {
        localStorage.setItem('accessToken', 'test-token');
        api.delete.mockResolvedValue({ data: { liked: false, likeCount: 2 } });

        renderButton({ liked: true, count: 3 });
        await userEvent.click(likeButton());

        expect(api.delete).toHaveBeenCalledWith('/posts/7/likes');
        expect(await screen.findByText('2')).toBeInTheDocument();
    });

    it('응답이 오기 전에는 버튼이 비활성화된다', async () => {
        localStorage.setItem('accessToken', 'test-token');
        let finishRequest: (value: unknown) => void = () => {};
        api.post.mockReturnValue(new Promise((resolve) => { finishRequest = resolve; }));

        renderButton();
        await userEvent.click(likeButton());

        expect(likeButton()).toBeDisabled();

        finishRequest({ data: { liked: true, likeCount: 4 } });
        await waitFor(() => expect(likeButton()).toBeEnabled());
    });

    it('누른 상태를 aria-pressed로 알린다', () => {
        renderButton({ liked: true, count: 1 });

        expect(likeButton()).toHaveAttribute('aria-pressed', 'true');
    });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- LikeButton`
Expected: FAIL — `Failed to resolve import "./LikeButton"`

- [ ] **Step 3: useLike 훅을 구현한다**

`src/hooks/useLike.ts`:

```ts
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';

/** 좋아요를 누를 대상. 그대로 URL 경로가 된다. */
export type LikeTarget = 'posts' | 'comments';

export interface LikeState {
    liked: boolean;
    count: number;
}

/**
 * 게시글·댓글 좋아요의 단일 진입점.
 *
 * 서버 응답을 그대로 상태로 삼는다(낙관적 업데이트 없음). 백엔드의 좋아요는
 * 멱등이라 이미 눌린 상태에서 POST해도 카운트가 오르지 않는데, 미리 숫자를
 * 올려두면 서버와 어긋난다. 응답을 기다렸다 받아쓰면 롤백 로직이 필요 없다.
 */
export const useLike = (target: LikeTarget, id: number, initial: LikeState) => {
    const navigate = useNavigate();
    const [liked, setLiked] = useState(initial.liked);
    const [count, setCount] = useState(initial.count);
    const [pending, setPending] = useState(false);

    // 부모가 목록을 다시 불러오면 서버 값으로 맞춘다.
    // 댓글 등록 후 재조회할 때 key가 유지되므로, 초기값만 쓰면 숫자가 옛 값에 멈춘다.
    useEffect(() => {
        setLiked(initial.liked);
        setCount(initial.count);
    }, [initial.liked, initial.count]);

    const toggle = async () => {
        // 비로그인은 API를 부르지 않는다. 401이 나가면 axios 인터셉터가
        // 한 번도 로그인한 적 없는 사람에게 '세션이 만료되었습니다'를 띄운다.
        if (!localStorage.getItem('accessToken')) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        // 연타로 같은 요청이 두 번 나가는 것을 막는다.
        if (pending) return;

        setPending(true);
        try {
            const url = `/${target}/${id}/likes`;
            const response = liked ? await api.delete(url) : await api.post(url);
            setLiked(response.data.liked);
            setCount(response.data.likeCount);
        } catch (error) {
            alert(errorMessage(error, '좋아요 처리에 실패했습니다.'));
        } finally {
            setPending(false);
        }
    };

    return { liked, count, pending, toggle };
};
```

- [ ] **Step 4: LikeButton을 구현한다**

`src/components/LikeButton.tsx`:

```tsx
import { useLike } from '../hooks/useLike';
import type { LikeState, LikeTarget } from '../hooks/useLike';

interface LikeButtonProps {
    target: LikeTarget;
    id: number;
    /** 서버가 내려준 현재 상태. 부모가 재조회하면 이 값이 바뀌고 버튼이 따라간다. */
    initial: LikeState;
    size?: 'sm' | 'md';
}

const LikeButton = ({ target, id, initial, size = 'md' }: LikeButtonProps) => {
    const { liked, count, pending, toggle } = useLike(target, id, initial);

    return (
        <button
            type="button"
            onClick={toggle}
            disabled={pending}
            aria-label="좋아요"
            aria-pressed={liked}
            className={`inline-flex items-center gap-1 transition rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
            } ${liked ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
            <span>{count}</span>
        </button>
    );
};

export default LikeButton;
```

- [ ] **Step 5: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- LikeButton`
Expected: PASS (5개)

- [ ] **Step 6: 전체 테스트와 타입 검사를 돌린다**

Run: `npm test`
Expected: PASS (전체 19개)

Run: `npm run build`
Expected: 타입 오류 없이 성공

- [ ] **Step 7: diff를 검토하고 커밋한다**

```bash
git add src/hooks/useLike.ts src/components/LikeButton.tsx src/components/LikeButton.test.tsx
git commit -m "feat: 좋아요 훅과 버튼 컴포넌트"
```

---

### Task 4: PostDetailPage에 좋아요 붙이기

백엔드는 이미 `likeCount`와 `likedByMe`를 게시글 상세와 댓글 목록 양쪽에 내려주고 있다. 타입에 필드를 더하고 버튼을 놓으면 된다.

**Files:**
- Modify: `src/pages/PostDetailPage.tsx` (8-25행 타입, 152-155행 게시글 메타 영역, 191-212행 댓글 항목)

**Interfaces:**
- Consumes: `LikeButton` (Task 3)
- Produces: 없음 (화면 적용)

- [ ] **Step 1: import와 타입에 좋아요 필드를 더한다**

`src/pages/PostDetailPage.tsx` 상단 import에 추가한다:

```tsx
import LikeButton from '../components/LikeButton';
```

`interface PostDetail`에 두 필드를 더한다:

```tsx
interface PostDetail {
    id: number;
    title: string;
    content: string;
    viewCount: number;
    createdAt: string;
    boardId: number;
    userId: number; // 👇 [추가] 글 작성자 ID
    /** 좋아요 수. 백엔드 PostResponse가 함께 내려준다. */
    likeCount: number;
    /** 내가 눌렀는지. 비로그인이면 항상 false로 내려온다. */
    likedByMe: boolean;
}
```

`interface CommentData`에도 같은 두 필드를 더한다:

```tsx
interface CommentData {
    commentId: number;
    userId: number; // 👇 댓글 작성자 ID
    content: string;
    createAt: string;
    nickname: string; // 👇 [추가] 댓글 작성자 닉네임
    /** 좋아요 수. 백엔드 CommentResponse가 함께 내려준다. */
    likeCount: number;
    /** 내가 눌렀는지. 비로그인이면 항상 false로 내려온다. */
    likedByMe: boolean;
}
```

- [ ] **Step 2: 게시글 본문 아래에 좋아요 버튼을 놓는다**

게시글 상세 박스에서 본문을 그리는 `<div className="leading-relaxed ...">{post.content}</div>` 바로 뒤에 다음을 추가한다:

```tsx
<div className="pt-6 mt-6 border-t border-gray-200">
    <LikeButton
        target="posts"
        id={post.id}
        initial={{ liked: post.likedByMe, count: post.likeCount }}
    />
</div>
```

- [ ] **Step 3: 댓글마다 좋아요 버튼을 놓는다**

댓글 항목에서 작성 시각을 그리는 `<span className="mt-2 text-xs text-gray-400">` 블록 바로 뒤, 같은 `<div className="flex flex-col">` 안에 다음을 추가한다:

```tsx
<div className="mt-2">
    <LikeButton
        target="comments"
        id={comment.commentId}
        initial={{ liked: comment.likedByMe, count: comment.likeCount }}
        size="sm"
    />
</div>
```

- [ ] **Step 4: 전체 테스트와 타입 검사를 돌린다**

Run: `npm test`
Expected: PASS (전체 19개, 변동 없음)

Run: `npm run build`
Expected: 타입 오류 없이 성공

- [ ] **Step 5: diff를 검토하고 커밋한다**

```bash
git add src/pages/PostDetailPage.tsx
git commit -m "feat: 게시글·댓글 좋아요 버튼 노출"
```

---

### Task 5: SearchBox

검색어 하한을 프론트에서 먼저 거른다. 백엔드도 같은 규칙으로 400을 주지만, 왕복 한 번을 아끼고 사용자가 사유를 즉시 본다.

**Files:**
- Create: `src/constants/searchLimits.ts`
- Create: `src/components/SearchBox.tsx`
- Create: `src/components/SearchBox.test.tsx`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `SEARCH_MIN` = 2, `SEARCH_MAX` = 100 (`src/constants/searchLimits.ts`)
  - `SearchBox` 기본 export — props `{ initialQuery?: string }`

- [ ] **Step 1: 상수 파일을 만든다**

`src/constants/searchLimits.ts`:

```ts
/**
 * 검색어 길이 제한.
 *
 * 백엔드 SearchQuery와 같은 값이어야 한다. 하한 2글자는 MySQL ngram 파서의
 * 토큰 크기에서 나온다. 1글자는 인덱스에 토큰으로 존재하지 않아 항상 빈 결과다.
 */

/** 검색어 최소 길이 */
export const SEARCH_MIN = 2;

/** 검색어 최대 길이 */
export const SEARCH_MAX = 100;
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`src/components/SearchBox.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SearchBox from './SearchBox';

/**
 * 검색 제출이 어디로 갔는지 보려고 목적지 화면에서 검색어를 그대로 그린다.
 *
 * MemoryRouter는 실제 window.location을 바꾸지 않으므로
 * window.location.search가 아니라 useSearchParams로 읽어야 한다.
 */
const SearchResultStub = () => {
    const [params] = useSearchParams();
    return <div>검색 이동: {params.get('q')}</div>;
};

const renderSearchBox = (initialQuery?: string) =>
    render(
        <MemoryRouter initialEntries={['/boards']}>
            <Routes>
                <Route path="/boards" element={<SearchBox initialQuery={initialQuery} />} />
                <Route path="/search" element={<SearchResultStub />} />
            </Routes>
        </MemoryRouter>
    );

const searchInput = () => screen.getByRole('searchbox', { name: '검색어' });

describe('SearchBox', () => {
    it('2글자 미만이면 이동하지 않고 사유를 보여준다', async () => {
        renderSearchBox();

        await userEvent.type(searchInput(), '가');
        await userEvent.click(screen.getByRole('button', { name: '검색' }));

        expect(screen.getByText('검색어는 2글자 이상이어야 합니다.')).toBeInTheDocument();
        expect(screen.queryByText(/검색 이동/)).not.toBeInTheDocument();
    });

    it('2글자 이상이면 검색 결과로 이동한다', async () => {
        renderSearchBox();

        await userEvent.type(searchInput(), '스프링');
        await userEvent.click(screen.getByRole('button', { name: '검색' }));

        expect(await screen.findByText(/검색 이동/)).toBeInTheDocument();
    });

    it('앞뒤 공백만 있는 입력은 이동하지 않는다', async () => {
        renderSearchBox();

        await userEvent.type(searchInput(), '   ');
        await userEvent.click(screen.getByRole('button', { name: '검색' }));

        expect(screen.getByText('검색어는 2글자 이상이어야 합니다.')).toBeInTheDocument();
    });

    it('initialQuery를 받으면 입력창을 그 값으로 채운다', () => {
        renderSearchBox('스프링');

        expect(searchInput()).toHaveValue('스프링');
    });
});
```

- [ ] **Step 3: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- SearchBox`
Expected: FAIL — `Failed to resolve import "./SearchBox"`

- [ ] **Step 4: SearchBox를 구현한다**

`src/components/SearchBox.tsx`:

```tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEARCH_MAX, SEARCH_MIN } from '../constants/searchLimits';

interface SearchBoxProps {
    /** 검색 결과 화면에서 재검색할 때 현재 검색어를 채워 넣는다. */
    initialQuery?: string;
}

const SearchBox = ({ initialQuery = '' }: SearchBoxProps) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState(initialQuery);
    const [error, setError] = useState('');

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        // 백엔드 SearchQuery와 같은 정규화. 공백만 있는 입력을 여기서 걸러낸다.
        const normalized = query.trim().replace(/\s+/g, ' ');

        if (normalized.length < SEARCH_MIN) {
            setError(`검색어는 ${SEARCH_MIN}글자 이상이어야 합니다.`);
            return;
        }

        setError('');
        navigate(`/search?q=${encodeURIComponent(normalized)}`);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-md">
            <div className="flex items-center space-x-2">
                <input
                    type="search"
                    aria-label="검색어"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={SEARCH_MAX}
                    placeholder="제목·본문으로 검색"
                    className="flex-1 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded hover:bg-blue-700 whitespace-nowrap"
                >
                    검색
                </button>
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </form>
    );
};

export default SearchBox;
```

- [ ] **Step 5: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- SearchBox`
Expected: PASS (4개)

- [ ] **Step 6: BoardPage 헤더 아래에 검색창을 놓는다**

`src/pages/BoardPage.tsx` import에 추가한다:

```tsx
import SearchBox from '../components/SearchBox';
```

헤더 영역(`<div className="flex items-center justify-between mb-8">...</div>`) 바로 뒤에 추가한다:

```tsx
<div className="mb-6">
    <SearchBox />
</div>
```

- [ ] **Step 7: 전체 테스트와 타입 검사를 돌린다**

Run: `npm test`
Expected: PASS (전체 23개)

Run: `npm run build`
Expected: 타입 오류 없이 성공

- [ ] **Step 8: diff를 검토하고 커밋한다**

```bash
git add src/constants/searchLimits.ts src/components/SearchBox.tsx src/components/SearchBox.test.tsx src/pages/BoardPage.tsx
git commit -m "feat: 검색 입력창"
```

---

### Task 6: SearchPage와 라우트

검색어와 페이지를 URL에 둔다. 상태를 URL에 두면 새로고침·공유·뒤로가기가 전부 공짜로 동작한다.

**Files:**
- Create: `src/pages/SearchPage.tsx`
- Create: `src/pages/SearchPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `PostTable` (Task 1), `Pagination`·`PAGE_SIZE` (Task 2), `SearchBox` (Task 5), `PageResponse`·`PostSummary` (Task 1)
- Produces: `SearchPage` 기본 export (props 없음)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/pages/SearchPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchPage from './SearchPage';

vi.mock('../api/axios', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    errorMessage: (_e: unknown, fallback: string) => fallback,
}));

const api = (await import('../api/axios')).default as unknown as {
    get: ReturnType<typeof vi.fn>;
};

const makePosts = (count: number, startId: number) =>
    Array.from({ length: count }, (_, i) => ({
        id: startId + i,
        title: `게시글 ${startId + i}`,
        viewCount: 0,
        createdAt: '2026-07-24T10:00:00',
        userId: 1,
        nickname: '작성자',
        commentsSize: 0,
    }));

const bootPage = (posts: ReturnType<typeof makePosts>, totalElements: number, totalPages: number) => ({
    data: {
        content: posts,
        page: { size: 10, number: 0, totalElements, totalPages },
    },
});

const renderSearchPage = (search: string) =>
    render(
        <MemoryRouter initialEntries={[`/search${search}`]}>
            <SearchPage />
        </MemoryRouter>
    );

describe('SearchPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('검색어를 붙여 검색 API를 부르고 결과를 그린다', async () => {
        api.get.mockResolvedValue(bootPage(makePosts(2, 1), 2, 1));

        renderSearchPage('?q=스프링');

        expect(await screen.findByText('게시글 1')).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/posts/search', {
            params: { q: '스프링', page: 0, size: 10 },
        });
    });

    it('결과가 없으면 안내 문구를 보여준다', async () => {
        api.get.mockResolvedValue(bootPage([], 0, 0));

        renderSearchPage('?q=없는검색어');

        expect(await screen.findByText("'없는검색어'에 대한 검색 결과가 없습니다.")).toBeInTheDocument();
    });

    it('백엔드가 거절하면 그 사유를 화면에 보여준다', async () => {
        api.get.mockRejectedValue({ response: { status: 400 } });

        renderSearchPage('?q=가');

        expect(await screen.findByText('검색에 실패했습니다.')).toBeInTheDocument();
    });

    it('검색어가 없으면 API를 부르지 않는다', () => {
        renderSearchPage('');

        expect(api.get).not.toHaveBeenCalled();
        expect(screen.getByText('검색어를 입력해 주세요.')).toBeInTheDocument();
    });

    it('URL의 page를 그대로 요청에 싣는다', async () => {
        api.get.mockResolvedValue(bootPage(makePosts(10, 11), 30, 3));

        renderSearchPage('?q=스프링&page=1');

        expect(await screen.findByText('게시글 11')).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/posts/search', {
            params: { q: '스프링', page: 1, size: 10 },
        });
    });
});
```

세 번째 테스트에서 `errorMessage`가 모킹으로 fallback을 그대로 돌려주므로 화면에는 `'검색에 실패했습니다.'`가 뜬다. 실제 앱에서는 백엔드가 준 `"검색어는 2글자 이상이어야 합니다."`가 표시된다.

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `npm test -- SearchPage`
Expected: FAIL — `Failed to resolve import "./SearchPage"`

- [ ] **Step 3: SearchPage를 구현한다**

`src/pages/SearchPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import PostTable from '../components/PostTable';
import Pagination from '../components/Pagination';
import SearchBox from '../components/SearchBox';
import { PAGE_SIZE } from '../constants/pagination';
import type { PageResponse } from '../types/page';
import type { PostSummary } from '../types/post';

/**
 * 게시글 검색 결과.
 *
 * 검색어와 페이지를 URL 쿼리스트링에 둔다. 상태를 URL에 두면
 * 새로고침·링크 공유·뒤로가기가 전부 그대로 동작한다.
 */
const SearchPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const query = searchParams.get('q') ?? '';
    const currentPage = Number(searchParams.get('page') ?? '0');

    const [posts, setPosts] = useState<PostSummary[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!query) {
            setPosts([]);
            setTotalPages(0);
            setTotalElements(0);
            setError('');
            return;
        }

        const search = async () => {
            setError('');
            try {
                const response = await api.get<PageResponse<PostSummary>>('/posts/search', {
                    params: { q: query, page: currentPage, size: PAGE_SIZE },
                });
                setPosts(response.data.content ?? []);
                setTotalPages(response.data.page?.totalPages ?? 0);
                setTotalElements(response.data.page?.totalElements ?? 0);
            } catch (e) {
                // 검색은 실패가 잦은 동작이라 alert 대신 화면에 남긴다.
                setPosts([]);
                setTotalPages(0);
                setTotalElements(0);
                setError(errorMessage(e, '검색에 실패했습니다.'));
            }
        };

        search();
    }, [query, currentPage]);

    const goToPage = (page: number) => setSearchParams({ q: query, page: String(page) });

    return (
        <div className="max-w-4xl px-4 py-8 mx-auto">
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => navigate('/boards')}
                    className="text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                >
                    &larr; 목록으로 돌아가기
                </button>
            </div>

            <div className="mb-6">
                <SearchBox initialQuery={query} />
            </div>

            {!query && <p className="py-10 text-center text-gray-500">검색어를 입력해 주세요.</p>}

            {query && error && <p className="py-10 text-center text-red-500">{error}</p>}

            {query && !error && (
                <>
                    <p className="mb-4 text-sm text-gray-600">
                        '{query}' 검색 결과 {totalElements}건
                    </p>

                    <PostTable
                        posts={posts}
                        emptyMessage={`'${query}'에 대한 검색 결과가 없습니다.`}
                        onRowClick={(postId) => navigate(`/posts/${postId}`)}
                    />

                    <Pagination currentPage={currentPage} totalPages={totalPages} onChange={goToPage} />
                </>
            )}
        </div>
    );
};

export default SearchPage;
```

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `npm test -- SearchPage`
Expected: PASS (5개)

- [ ] **Step 5: 라우트를 등록한다**

`src/App.tsx`의 import에 추가한다:

```tsx
import SearchPage from './pages/SearchPage';
```

`<Route path="/boards" element={<BoardPage />} />` 바로 뒤에 추가한다:

```tsx
{/* 검색 결과. 검색어와 페이지는 쿼리스트링(?q=&page=)으로 받는다. */}
<Route path="/search" element={<SearchPage />} />
```

- [ ] **Step 6: 전체 테스트와 타입 검사를 돌린다**

Run: `npm test`
Expected: PASS (전체 28개)

Run: `npm run build`
Expected: 타입 오류 없이 성공

- [ ] **Step 7: diff를 검토하고 커밋한다**

```bash
git add src/pages/SearchPage.tsx src/pages/SearchPage.test.tsx src/App.tsx
git commit -m "feat: 게시글 검색 결과 화면"
```

---

## 최종 검증 (브라우저)

테스트만으로는 백엔드와의 실제 계약을 확인할 수 없다. 마지막에 반드시 직접 띄워 본다.

- [ ] **Step 1: 백엔드를 띄운다**

MySQL 8.0.44와 Redis 3.0.504가 실행 중인지 확인한 뒤, `C:\Users\wlqkr\IdeaProjects\posthub`에서:

Run: `./gradlew bootRun`
Expected: `posthub` DB에 붙어 기동 (개발용 DB이므로 절대 비우지 않는다)

- [ ] **Step 2: 프론트를 띄운다**

`C:\Users\wlqkr\IdeaProjects\posthub-front`에서:

Run: `npm run dev`
Expected: `VITE_API_URL`이 백엔드 주소를 가리키는 상태로 기동

- [ ] **Step 3: 좋아요를 확인한다**

1. 로그아웃 상태에서 아무 글에 들어가 좋아요를 누른다 → **"로그인이 필요합니다."**가 떠야 한다. "로그인 세션이 만료되었습니다"가 뜨면 `useLike`의 토큰 확인이 빠진 것이다.
2. 로그인 후 게시글 좋아요를 누른다 → 하트가 채워지고 숫자가 1 오른다.
3. 새로고침한다 → 하트와 숫자가 유지된다.
4. 다시 눌러 취소한다 → 숫자가 1 줄어든다. 새로고침해도 유지된다.
5. 댓글 좋아요도 1~4를 반복한다.
6. 댓글을 새로 등록한 뒤 기존 댓글의 좋아요 숫자가 그대로인지 본다 → 재조회 후에도 옛 값에 멈추지 않아야 한다.

- [ ] **Step 4: 검색을 확인한다**

1. 게시판 화면 검색창에 1글자를 넣고 검색 → 이동하지 않고 "검색어는 2글자 이상이어야 합니다."가 뜬다.
2. 2글자 이상으로 검색 → `/search?q=...`로 이동하고 결과가 나온다.
3. 결과가 여러 페이지면 2페이지를 누른다 → URL의 `page`가 바뀌고 목록이 갱신된다.
4. 브라우저 뒤로가기 → 1페이지로 돌아간다.
5. 검색 결과 URL을 새 탭에 붙여넣는다 → 같은 결과가 나온다.
6. 결과가 없는 검색어를 넣는다 → "'...'에 대한 검색 결과가 없습니다."가 뜬다.

- [ ] **Step 5: 목록 화면을 확인한다**

1. 게시판 목록에 댓글 수 열이 보인다.
2. 글이 6페이지 이상인 게시판에서 페이지 버튼이 5개를 넘지 않는다.

---

## 자기 검토 결과

**스펙 커버리지** — 스펙의 각 항목이 어느 태스크에 있는지:

| 스펙 항목 | 태스크 |
|---|---|
| `useLike` 5단계 실행 순서 | Task 3 Step 3 |
| 401 인터셉터 회피 | Task 3 Step 3, 최종 검증 Step 3-1 |
| 낙관적 업데이트 안 함 | Task 3 Step 3 |
| initial 동기화 | Task 3 Step 3, 최종 검증 Step 3-6 |
| LikeButton `aria-pressed`, size | Task 3 Step 4 |
| SearchBox 2자 하한 | Task 5 |
| SearchPage URL 상태 | Task 6 |
| PostTable 댓글 수 열 | Task 1 |
| Pagination 윈도우 5 | Task 2 |
| PostDetailPage 좋아요 2군데 | Task 4 |
| `/search` 라우트 | Task 6 Step 5 |
| 에러 처리 표 6줄 | Task 3(좋아요 2줄), Task 5(2자 미만), Task 6(400·네트워크·0건) |
| 테스트 4묶음 | Task 1·2·3·6 |
| 백엔드 미수정 | Global Constraints |

빠진 항목 없음.

**플레이스홀더** — TBD/TODO/"적절히 처리" 없음. 모든 코드 단계에 실제 코드가 들어 있다.

**타입 일관성** — `PostSummary`(Task 1)를 Task 6이 그대로 쓴다. `LikeState`/`LikeTarget`(Task 3)을 Task 4가 그대로 쓴다. `PAGE_SIZE`(Task 2)를 Task 6이 쓴다. `PageResponse<T>`(Task 1)를 Task 6이 쓴다. 이름과 시그니처가 태스크 간에 일치한다.
