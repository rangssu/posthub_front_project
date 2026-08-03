import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostWritePage from './PostWritePage';

/**
 * 검증이 칸별로 갈라진다는 것을 고정한다.
 *
 * 전에는 '제목과 내용을 모두 입력해주세요.' 하나를 alert로 띄웠다. 둘 중 어느
 * 쪽이 비었는지 알려주지 않아, 다 채웠다고 생각한 사용자는 같은 알림을 두 번
 * 보게 된다.
 */
vi.mock('../api/axios', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    errorMessage: (_e: unknown, fallback: string) => fallback,
}));

const api = (await import('../api/axios')).default as unknown as {
    post: ReturnType<typeof vi.fn>;
};

const renderWritePage = () =>
    render(
        <MemoryRouter initialEntries={['/boards/1/write']}>
            <Routes>
                <Route path="/boards/:boardId/write" element={<PostWritePage />} />
            </Routes>
        </MemoryRouter>
    );

const submitWrite = async (user: ReturnType<typeof userEvent.setup>) => {
    const form = screen.getByRole('form', { name: '새 글 작성' });
    await user.click(within(form).getByRole('button', { name: '작성 완료' }));
};

describe('PostWritePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('제목이 비면 제목 칸 아래에 오류를 보여준다', async () => {
        const user = userEvent.setup();
        renderWritePage();

        await user.type(screen.getByLabelText('내용'), '본문입니다');
        await submitWrite(user);

        expect(screen.getByLabelText('제목')).toHaveAccessibleDescription('제목을 입력해주세요.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('내용이 비면 내용 칸 아래에 오류를 보여준다', async () => {
        const user = userEvent.setup();
        renderWritePage();

        await user.type(screen.getByLabelText('제목'), '제목입니다');
        await submitWrite(user);

        expect(screen.getByLabelText('내용')).toHaveAccessibleDescription('내용을 입력해주세요.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('공백만 넣은 것은 채운 것으로 치지 않는다', async () => {
        const user = userEvent.setup();
        renderWritePage();

        await user.type(screen.getByLabelText('제목'), '   ');
        await user.type(screen.getByLabelText('내용'), '   ');
        await submitWrite(user);

        expect(screen.getAllByRole('alert')).toHaveLength(2);
        expect(api.post).not.toHaveBeenCalled();
    });

    it('검증을 통과하면 그 게시판으로 글을 보낸다', async () => {
        const user = userEvent.setup();
        api.post.mockResolvedValue({ data: 42 });
        renderWritePage();

        await user.type(screen.getByLabelText('제목'), '제목입니다');
        await user.type(screen.getByLabelText('내용'), '본문입니다');
        await submitWrite(user);

        expect(api.post).toHaveBeenCalledWith('/board/1/posts', {
            title: '제목입니다',
            content: '본문입니다',
        });
    });
});
