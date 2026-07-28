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

    it('부모가 새 initial을 내려주면 서버 값을 따라간다', () => {
        const { rerender } = render(
            <LikeButton target="comments" id={1} initial={{ liked: false, count: 3 }} />,
            { wrapper: MemoryRouter }
        );

        rerender(<LikeButton target="comments" id={1} initial={{ liked: true, count: 9 }} />);

        expect(screen.getByText('9')).toBeInTheDocument();
    });
});
