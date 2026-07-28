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
        // jsdom에는 alert가 없어서 스텁이 없으면 여러 경로에서 예외가 난다.
        vi.stubGlobal('alert', vi.fn());
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
