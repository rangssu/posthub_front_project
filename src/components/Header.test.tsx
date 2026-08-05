import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Header from './Header';

/**
 * 로그아웃 동작 검증.
 *
 * 원래 BoardPage.tsx에 있던 handleLogout이 Task 8에서 Header로 옮겨왔는데(Task 6),
 * 그 동작을 검증하던 테스트는 BoardPage.test.tsx에서 지워지기만 하고 여기로
 * 옮겨오지 않아 커버리지가 비어 있었다. 이 파일이 그 빈자리를 메운다.
 *
 * 리프레시 토큰은 httpOnly 쿠키라 프론트가 지울 수 없다. 서버에 알리지 않으면
 * 로그아웃한 뒤에도 그 쿠키로 새 액세스 토큰을 계속 받아갈 수 있다.
 */
vi.mock('../api/axios', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    errorMessage: (_e: unknown, fallback: string) => fallback,
}));

const api = (await import('../api/axios')).default as unknown as {
    post: ReturnType<typeof vi.fn>;
};

const renderHeader = () => render(<Header />, { wrapper: MemoryRouter });

const clickLogout = async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: '로그아웃' }));
};

describe('Header 로그아웃', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        localStorage.setItem('accessToken', 'token');
        localStorage.setItem('userId', '1');
        localStorage.setItem('role', 'USER');
    });

    it('서버에 로그아웃을 알리고 인증 정보를 지운다', async () => {
        api.post.mockResolvedValue({ status: 204 });

        await clickLogout();

        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/logout'));
        await waitFor(() => expect(localStorage.getItem('accessToken')).toBeNull());
        expect(localStorage.getItem('userId')).toBeNull();
        expect(localStorage.getItem('role')).toBeNull();
    });

    it('서버 로그아웃이 실패해도 인증 정보는 지운다', async () => {
        // 서버가 죽었다고 로그아웃이 막히면 안 된다.
        api.post.mockRejectedValue(new Error('network'));

        await clickLogout();

        await waitFor(() => expect(localStorage.getItem('accessToken')).toBeNull());
        expect(localStorage.getItem('userId')).toBeNull();
        expect(localStorage.getItem('role')).toBeNull();
    });
});
