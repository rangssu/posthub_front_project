import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostDetailPage from './PostDetailPage';

/**
 * 좋아요 기능의 유일한 통합 지점을 검증한다.
 *
 * LikeButton은 단위 테스트에서 initial을 손으로 넣어 확인하지만,
 * PostDetailPage가 게시글에는 게시글 id를, 댓글에는 어떤 id를 넘기는지는
 * 여기서만 확인할 수 있다. commentId와 userId 둘 다 number라서 tsc는
 * 뒤바뀌어도 잡아내지 못한다.
 */

vi.mock('../api/axios', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    errorMessage: (_e: unknown, fallback: string) => fallback,
}));

const api = (await import('../api/axios')).default as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};

const post = {
    id: 7,
    title: '제목',
    content: '본문',
    viewCount: 10,
    createdAt: '2026-07-24T10:00:00',
    boardId: 1,
    userId: 1,
    likeCount: 5,
    likedByMe: false,
};

// commentId(42)와 userId(99)를 다른 값으로 둬서, 좋아요 버튼이 둘 중
// 어느 쪽을 쓰는지 뒤섞이면 바로 드러나게 한다.
const comment = {
    commentId: 42,
    userId: 99,
    content: '댓글 내용',
    createAt: '2026-07-24T11:00:00',
    nickname: '댓글러',
    likeCount: 2,
    likedByMe: false,
};

const renderPostDetailPage = () =>
    render(
        <MemoryRouter initialEntries={['/posts/7']}>
            <Routes>
                <Route path="/posts/:postId" element={<PostDetailPage />} />
            </Routes>
        </MemoryRouter>
    );

const mockApiGet = () => {
    api.get.mockImplementation((url: string) => {
        if (url === '/posts/7') return Promise.resolve({ data: post });
        if (url === '/posts/7/comments') return Promise.resolve({ data: [comment] });
        return Promise.reject(new Error(`unexpected url: ${url}`));
    });
};

describe('PostDetailPage 좋아요 연동', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('게시글의 좋아요 버튼은 게시글을 대상으로 한다', async () => {
        localStorage.setItem('accessToken', 'test-token');
        mockApiGet();
        api.post.mockResolvedValue({ data: { liked: true, likeCount: 6 } });

        renderPostDetailPage();

        expect(await screen.findByText('제목')).toBeInTheDocument();

        const likeButtons = screen.getAllByRole('button', { name: '좋아요' });
        // 첫 번째 좋아요 버튼이 게시글 본문 쪽(댓글보다 앞)에 렌더링된다.
        await userEvent.click(likeButtons[0]);

        expect(api.post).toHaveBeenCalledWith('/posts/7/likes');
    });

    it('댓글의 좋아요 버튼은 댓글 id를 대상으로 한다', async () => {
        localStorage.setItem('accessToken', 'test-token');
        mockApiGet();
        api.post.mockResolvedValue({ data: { liked: true, likeCount: 3 } });

        renderPostDetailPage();

        expect(await screen.findByText('댓글 내용')).toBeInTheDocument();

        const commentBlock = screen.getByText('댓글 내용').closest('div')!.parentElement!;
        const commentLikeButton = within(commentBlock).getByRole('button', { name: '좋아요' });
        await userEvent.click(commentLikeButton);

        expect(api.post).toHaveBeenCalledWith('/comments/42/likes');
        expect(api.post).not.toHaveBeenCalledWith('/comments/99/likes');
        expect(api.post).not.toHaveBeenCalledWith('/posts/42/likes');
    });

    it('서버가 내려준 좋아요 수를 초기값으로 그린다', async () => {
        mockApiGet();

        renderPostDetailPage();

        expect(await screen.findByText('제목')).toBeInTheDocument();

        const likeButtons = screen.getAllByRole('button', { name: '좋아요' });
        expect(within(likeButtons[0]).getByText('5')).toBeInTheDocument();

        const commentBlock = screen.getByText('댓글 내용').closest('div')!.parentElement!;
        const commentLikeButton = within(commentBlock).getByRole('button', { name: '좋아요' });
        expect(within(commentLikeButton).getByText('2')).toBeInTheDocument();
    });
});

/**
 * 브라우저 기본 팝업을 걷어낸 자리를 검증한다.
 *
 * confirm은 동기라 "확인하지 않으면 요청이 안 나간다"가 코드 한 줄로 보장됐지만,
 * 다이얼로그는 비동기라 그 보장이 상태 관리로 옮겨갔다. 확인을 거치지 않고
 * 삭제 요청이 나가는 회귀는 여기서만 잡힌다.
 */
describe('PostDetailPage 삭제 확인과 댓글 검증', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        localStorage.setItem('accessToken', 'test-token');
        mockApiGet();
    });

    it('게시글 삭제는 확인을 거친다', async () => {
        // post.userId가 1이라 이 계정에만 게시글 삭제 버튼이 보인다.
        localStorage.setItem('userId', '1');
        const user = userEvent.setup();

        renderPostDetailPage();

        await user.click(await screen.findByRole('button', { name: '삭제' }));
        expect(api.delete).not.toHaveBeenCalled();

        // 페이지의 삭제 버튼과 이름이 같으므로 다이얼로그 안으로 범위를 좁힌다.
        const dialog = screen.getByRole('dialog', { name: '게시글을 삭제할까요?' });
        await user.click(within(dialog).getByRole('button', { name: '삭제' }));

        expect(api.delete).toHaveBeenCalledWith('/posts/7');
    });

    it('취소하면 삭제 요청이 나가지 않는다', async () => {
        localStorage.setItem('userId', '1');
        const user = userEvent.setup();

        renderPostDetailPage();

        await user.click(await screen.findByRole('button', { name: '삭제' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(api.delete).not.toHaveBeenCalled();
    });

    it('댓글 삭제는 그 댓글의 id로 확인을 거친다', async () => {
        // comment.userId가 99라 이 계정에는 댓글 삭제 버튼만 보인다(게시글 것은 안 보인다).
        localStorage.setItem('userId', '99');
        const user = userEvent.setup();

        renderPostDetailPage();

        await user.click(await screen.findByRole('button', { name: '댓글 삭제' }));
        expect(api.delete).not.toHaveBeenCalled();

        const dialog = screen.getByRole('dialog', { name: '댓글을 삭제할까요?' });
        await user.click(within(dialog).getByRole('button', { name: '삭제' }));

        // commentId(42)를 써야 한다. userId(99)를 쓰면 남의 댓글을 지운다.
        expect(api.delete).toHaveBeenCalledWith('/comments/42');
    });

    it('빈 댓글은 인라인 오류를 보여주고 전송하지 않는다', async () => {
        const user = userEvent.setup();

        renderPostDetailPage();

        await user.click(await screen.findByRole('button', { name: '댓글 등록' }));

        // 토스트가 아니라 입력 아래 인라인이다. 어느 칸이 비었는지 알려줘야 쓸모가 있다.
        expect(screen.getByRole('alert')).toHaveTextContent('댓글 내용을 입력해주세요.');
        expect(screen.getByLabelText('댓글')).toHaveAccessibleDescription('댓글 내용을 입력해주세요.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('댓글을 등록하면 인라인 오류가 사라진다', async () => {
        const user = userEvent.setup();
        api.post.mockResolvedValue({ data: {} });

        renderPostDetailPage();

        await user.click(await screen.findByRole('button', { name: '댓글 등록' }));
        expect(screen.getByRole('alert')).toBeInTheDocument();

        await user.type(screen.getByLabelText('댓글'), '새 댓글');
        await user.click(screen.getByRole('button', { name: '댓글 등록' }));

        expect(api.post).toHaveBeenCalledWith('/posts/7/comments', { content: '새 댓글' });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
