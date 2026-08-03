import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

/**
 * 검증 실패가 사용자에게 닿는 방식을 고정한다.
 *
 * 전에는 alert였다. 어느 칸이 틀렸는지 알 수 없고, 알림을 닫는 동안 입력칸은
 * 그대로다. 인라인으로 옮기면서 "요청이 나가지 않는다"는 보장도 함께 지킨다 -
 * 검증을 통과하지 못한 값이 서버로 새 나가는 회귀는 여기서만 잡힌다.
 */
vi.mock('../api/axios', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    errorMessage: (_e: unknown, fallback: string) => fallback,
}));

const api = (await import('../api/axios')).default as unknown as {
    post: ReturnType<typeof vi.fn>;
};

const renderLogin = () =>
    render(
        <MemoryRouter>
            <LoginPage />
        </MemoryRouter>
    );

/** 헤더에도 '로그인' 버튼이 있으므로 폼 안으로 범위를 좁힌다. */
const submitLogin = async (user: ReturnType<typeof userEvent.setup>) => {
    const form = screen.getByRole('form', { name: '로그인' });
    await user.click(within(form).getByRole('button', { name: '로그인' }));
};

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('아이디가 짧으면 그 칸 아래에 오류를 보여준다', async () => {
        const user = userEvent.setup();
        renderLogin();

        await user.type(screen.getByLabelText('아이디'), 'ab');
        await user.type(screen.getByLabelText('비밀번호'), 'password123');
        await submitLogin(user);

        expect(screen.getByLabelText('아이디')).toHaveAccessibleDescription(
            '아이디는 4자 이상 20자 이하여야 합니다.'
        );
        expect(api.post).not.toHaveBeenCalled();
    });

    it('비밀번호가 짧으면 그 칸 아래에 오류를 보여준다', async () => {
        const user = userEvent.setup();
        renderLogin();

        await user.type(screen.getByLabelText('아이디'), 'rangssu');
        await user.type(screen.getByLabelText('비밀번호'), 'short');
        await submitLogin(user);

        expect(screen.getByLabelText('비밀번호')).toHaveAccessibleDescription(
            '비밀번호는 8자 이상 20자 이하여야 합니다.'
        );
        expect(api.post).not.toHaveBeenCalled();
    });

    it('빈 칸은 각자의 오류를 동시에 보여준다', async () => {
        // alert는 한 번에 하나만 알려줘서 고치고 누르기를 반복해야 했다.
        const user = userEvent.setup();
        renderLogin();

        await submitLogin(user);

        expect(screen.getByLabelText('아이디')).toHaveAccessibleDescription('아이디를 입력해주세요.');
        expect(screen.getByLabelText('비밀번호')).toHaveAccessibleDescription('비밀번호를 입력해주세요.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('검증을 통과하면 로그인 요청을 보내고 인증 정보를 저장한다', async () => {
        const user = userEvent.setup();
        api.post.mockResolvedValue({ data: { accessToken: 't', userId: 1, role: 'USER' } });
        renderLogin();

        await user.type(screen.getByLabelText('아이디'), 'rangssu');
        await user.type(screen.getByLabelText('비밀번호'), 'password123');
        await submitLogin(user);

        expect(api.post).toHaveBeenCalledWith('/auth/login', {
            loginId: 'rangssu',
            password: 'password123',
        });
        expect(localStorage.getItem('accessToken')).toBe('t');
        expect(localStorage.getItem('role')).toBe('USER');
    });

    it('고치고 다시 제출하면 앞선 오류가 사라진다', async () => {
        const user = userEvent.setup();
        api.post.mockResolvedValue({ data: { accessToken: 't', userId: 1, role: 'USER' } });
        renderLogin();

        await submitLogin(user);
        expect(screen.getAllByRole('alert')).toHaveLength(2);

        await user.type(screen.getByLabelText('아이디'), 'rangssu');
        await user.type(screen.getByLabelText('비밀번호'), 'password123');
        await submitLogin(user);

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
