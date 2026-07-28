# 프론트엔드 좋아요·검색 설계

작성일: 2026-07-28

## 배경

백엔드에는 게시글 좋아요, 댓글 좋아요, 게시글 검색이 이미 구현돼 있다(마이그레이션 V6~V9).
그런데 `posthub-front/src`를 검색하면 like/search 관련 참조가 하나도 없다. 백엔드를 배포해도
사용자에게는 이 기능들이 보이지 않는다. 이 문서는 그 간극을 메우는 프론트엔드 작업을 정의한다.

**백엔드는 수정하지 않는다.** 필요한 API가 모두 준비돼 있고, 백엔드를 건드리면 미배포
마이그레이션이 더 늘어나 배포 리스크가 커진다.

## 사용할 백엔드 API

| 엔드포인트 | 응답 | 인증 |
|---|---|---|
| `POST /api/posts/{postId}/likes` | `{ liked, likeCount }` | 필요 |
| `DELETE /api/posts/{postId}/likes` | `{ liked, likeCount }` | 필요 |
| `POST /api/comments/{commentId}/likes` | `{ liked, likeCount }` | 필요 |
| `DELETE /api/comments/{commentId}/likes` | `{ liked, likeCount }` | 필요 |
| `GET /api/posts/search?q=&page=&size=` | `Page<PostListResponse>` | 불필요 |

이미 내려오고 있으나 프론트가 안 쓰는 필드:

- `GET /api/posts/{postId}` → `likeCount`, `likedByMe`
- `GET /api/posts/{postId}/comments` → 각 댓글의 `likeCount`, `likedByMe`
- 목록/검색의 `PostListResponse` → `commentsSize`

**`PostListResponse`에는 `likeCount`가 없다.** 따라서 글 목록과 검색 결과에는 좋아요 수를
표시하지 않는다. 표시하려면 백엔드 DTO와 JPQL 프로젝션을 고쳐야 하는데, 이번 범위 밖이다.

### 검색어 규칙

`SearchQuery`가 검증한다. 2자 미만이거나 100자 초과면 400과 함께 사유 메시지가 내려온다.
공백은 하나로 정규화된다. 검색은 전체 게시판 대상이고 정렬은 최신순 고정이다.

## 범위

포함: 게시글 좋아요, 댓글 좋아요, 게시글 검색, 목록에 댓글 수 노출, 페이징 버튼 수 제한.

제외: 대댓글 UI(백엔드에 `parentId`/`replies`가 있으나 이번엔 다루지 않는다),
목록의 좋아요 수, 백엔드 변경 일체.

## 아키텍처

### 새 파일

```
src/hooks/useLike.ts          좋아요 상태·API 호출·에러
src/components/LikeButton.tsx  useLike를 쓰는 자기완결 버튼
src/components/PostTable.tsx   글 목록 테이블
src/components/Pagination.tsx  페이지 버튼
src/components/SearchBox.tsx   검색 입력
src/pages/SearchPage.tsx       검색 결과 화면
```

### 수정할 파일

```
src/App.tsx                    /search 라우트 추가
src/pages/BoardPage.tsx        테이블·페이징을 컴포넌트로 교체, 검색창 추가
src/pages/PostDetailPage.tsx   좋아요 버튼 2군데, 타입에 필드 추가
src/pages/BoardPage.test.tsx   픽스처에 commentsSize 추가
```

`PostTable`과 `Pagination` 추출은 SearchPage가 같은 마크업을 필요로 하기 때문이다.
추출하지 않으면 테이블 약 45줄과 페이징 약 35줄이 두 화면에 복사된다.

## useLike

```ts
type LikeTarget = 'posts' | 'comments';

interface LikeState {
  liked: boolean;
  count: number;
}

useLike(target: LikeTarget, id: number, initial: LikeState)
  → { liked: boolean; count: number; pending: boolean; toggle: () => Promise<void> }
```

`toggle()`의 실행 순서:

1. `localStorage.getItem('accessToken')`이 없으면 **API를 호출하지 않고** 안내 후 `/login`으로 보낸다
2. `pending`이면 즉시 반환한다 (연타 방지)
3. `liked`면 `api.delete`, 아니면 `api.post`를 `/${target}/${id}/likes`로 보낸다
4. 응답의 `{ liked, likeCount }`를 그대로 상태에 반영한다
5. 실패하면 `errorMessage(error, '좋아요 처리에 실패했습니다.')`로 알리고 상태는 그대로 둔다

### 1번이 필요한 이유

`src/api/axios.ts`의 응답 인터셉터는 401을 무조건 세션 만료로 해석해 localStorage를 비우고
"로그인 세션이 만료되었습니다" 알림 후 `/login`으로 강제 이동시킨다. 비로그인 사용자가
좋아요를 누르면 백엔드가 401을 주므로, 한 번도 로그인한 적 없는 사람이 세션 만료 알림을
보게 된다. 인터셉터를 고치면 다른 화면까지 영향을 주므로, 좋아요 쪽에서 401이 발생하지
않게 막는다.

### 4번이 필요한 이유

낙관적 업데이트를 하지 않는다. 백엔드의 좋아요는 멱등 처리라(이미 눌린 상태에서 POST하면
카운트를 올리지 않는다) 서버가 돌려주는 값이 클라이언트의 예상과 다를 수 있다. 서버 값을
그대로 받아쓰면 롤백 로직이 아예 필요 없고 화면이 항상 서버와 일치한다.

### initial 동기화

`initial`이 바뀌면 `useEffect`로 상태를 갱신한다. 댓글을 등록하면 PostDetailPage가 댓글
목록을 재조회하는데, 컴포넌트가 `key={commentId}`로 유지되면 초기값만 쓰는 구현에서는
좋아요 숫자가 옛 값에 멈춘다.

## LikeButton

```tsx
<LikeButton target="posts" id={post.id}
            initial={{ liked: post.likedByMe, count: post.likeCount }}
            size="md" />
```

훅을 내부에서 호출해 페이지에서는 한 줄로 끝난다. 하트 아이콘과 숫자를 함께 표시하고,
눌린 상태는 빨강, 아니면 회색이다. `pending`이면 `disabled`.

`aria-pressed={liked}`와 `aria-label="좋아요"`를 단다. 테스트에서 상태를 잡기 쉽고
스크린리더에도 토글 상태가 전달된다.

`size`는 `'sm' | 'md'`. 댓글에는 `sm`, 게시글 본문에는 `md`를 쓴다.

## 검색

### SearchBox

로컬 input 상태를 갖고, 제출하면 `navigate('/search?q=' + encodeURIComponent(query))`로
이동한다. 입력이 2자 미만이면 제출하지 않고 입력창 아래에 안내를 표시한다. 백엔드와 같은
규칙을 프론트에서 먼저 걸러 왕복을 아낀다.

BoardPage 헤더 아래와 SearchPage 상단 양쪽에 놓는다. 결과 화면에서 재검색이 가능해야 한다.

### SearchPage

`useSearchParams()`로 `q`와 `page`를 읽는다. 두 값이 바뀔 때마다
`GET /posts/search?q=&page=&size=10`을 호출한다.

페이지 이동은 `setSearchParams`로 URL을 갱신해 일으킨다. 상태를 URL에 두면 새로고침·공유·
뒤로가기가 모두 동작한다.

`q`가 없거나 빈 문자열이면 API를 호출하지 않고 검색어 입력 안내만 보여준다.

화면 구성: 상단에 "목록으로" 링크와 SearchBox, 그 아래 `'{q}' 검색 결과 N건`,
그리고 `PostTable` + `Pagination`.

## PostTable / Pagination

### PostTable

```tsx
<PostTable posts={posts} onRowClick={(id) => navigate(`/posts/${id}`)} />
```

BoardPage의 현재 테이블 마크업을 그대로 옮긴다. 제목 20자 초과 시 자르고 `...`을 붙이는
동작, `title` 속성에 전체 제목을 넣는 동작을 유지한다.

열 구성: 제목 / 작성자 / 작성일 / 조회수 / **댓글수**. 댓글수는 `commentsSize`로,
응답에 이미 있는데 쓰지 않던 값이다.

글이 없을 때의 빈 상태 문구는 prop으로 받는다. 게시판 목록은 "작성된 게시글이 없습니다.",
검색은 "'{q}'에 대한 검색 결과가 없습니다."로 달라야 한다.

### Pagination

```tsx
<Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
```

현재 페이지를 중심으로 최대 5개의 페이지 버튼만 그린다. 현재 구현은
`Array.from({ length: totalPages })`로 전체를 그리는데, 검색은 전체 게시판 대상이라
결과가 수백 페이지면 버튼이 수백 개 깔린다.

`totalPages > 0`일 때 렌더하는 기존 조건은 유지한다. 기존 테스트가 1페이지일 때 버튼이
1개 그려지는 것을 검증하고 있다.

## PostDetailPage 변경

타입에 필드를 추가한다:

- `PostDetail`에 `likeCount: number`, `likedByMe: boolean`
- `CommentData`에 `likeCount: number`, `likedByMe: boolean`

좋아요 버튼을 두 군데 놓는다:

- 게시글 상세 박스에서 조회수·작성일 줄 아래
- 각 댓글 항목에서 작성 시각 옆

## 에러 처리

| 상황 | 처리 |
|---|---|
| 비로그인 좋아요 클릭 | API 미호출, 안내 후 `/login` |
| 좋아요 API 실패 | `errorMessage()` 알림, 상태 유지 |
| 검색어 2자 미만 | 제출 차단 + 입력창 아래 인라인 안내 |
| 검색 400 | 백엔드 메시지를 결과 영역에 인라인 표시 |
| 검색 네트워크 오류 | fallback 메시지를 인라인 표시 |
| 검색 결과 0건 | `'{q}'에 대한 검색 결과가 없습니다.` |

검색 오류는 `alert`가 아니라 화면에 표시한다. 검색은 실패가 잦은 동작이라 모달을 반복해서
닫게 만들면 성가시다. 좋아요 실패는 드물고 즉각적인 피드백이 필요하므로 기존 코드의
`alert` 방식을 따른다.

## 테스트

기존 `BoardPage.test.tsx`의 패턴을 따른다. `vi.mock('../api/axios')`로 axios를 모킹하고
`MemoryRouter`로 감싼다. 클릭은 `@testing-library/user-event`를 쓴다.

**`LikeButton.test.tsx`**
- 비로그인 상태에서 클릭하면 api가 호출되지 않는다
- 로그인 상태에서 클릭하면 POST를 보내고 응답의 `likeCount`가 화면에 반영된다
- 이미 눌린 상태에서 클릭하면 DELETE를 보낸다
- 요청이 끝나기 전에는 버튼이 disabled다

**`SearchPage.test.tsx`**
- `?q=스프링`이면 `/posts/search`를 `q`와 함께 호출하고 결과 행을 그린다
- 결과가 0건이면 안내 문구를 보여준다
- 400 응답이면 백엔드 메시지를 화면에 보여준다

**`Pagination.test.tsx`**
- `totalPages=30`이어도 페이지 번호 버튼은 5개이고 이전/다음이 함께 있다

**기존 `BoardPage.test.tsx`**
- 컴포넌트 교체 후에도 4개 테스트가 그대로 통과해야 한다
- 픽스처 `makePosts`에 `commentsSize`를 추가한다

## 검증

1. `npm test` — 신규·기존 테스트 전부 그린
2. `npm run build` — `tsc -b`가 타입 오류 없이 통과
3. 백엔드(MySQL + Redis)를 띄우고 브라우저에서 확인
   - 로그인 후 게시글·댓글 좋아요를 누르고 취소했다가 새로고침해도 숫자와 하트 상태가 유지되는지
   - 로그아웃 상태에서 좋아요를 눌렀을 때 "세션이 만료되었습니다"가 아니라 로그인 안내가 뜨는지
   - 1글자 검색이 막히고, 2글자 이상 검색이 결과를 반환하는지
   - 검색 결과에서 뒤로가기를 눌렀을 때 이전 검색으로 돌아가는지

## 작업 순서

단위마다 작성 → 확인 → 테스트 → diff 리뷰 → 로컬 커밋을 반복한다. push는 요청이 있을 때만 한다.

1. `Pagination`, `PostTable` 추출 + BoardPage 교체 (기존 테스트 그린 유지)
2. `useLike`, `LikeButton` + 테스트
3. PostDetailPage에 좋아요 적용
4. `SearchBox`, `SearchPage` + 라우트 + 테스트
