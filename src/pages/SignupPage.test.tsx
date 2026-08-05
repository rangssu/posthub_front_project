import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignupPage from './SignupPage';

/**
 * 다섯 칸의 검증이 각자의 칸으로 간다는 것을 고정한다.
 *
 * 전에는 공백 다섯 가지를 '모든 항목을 공백 없이 입력해주세요.' 하나로 뭉쳐
 * alert로 띄웠다. 어느 칸이 비었는지 사용자가 직접 찾아야 했다.
 */
vi.mock('../api/axios', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    errorMessage: (_e: unknown, fallback: string) => fallback,
}));

const api = (await import('../api/axios')).default as unknown as {
    post: ReturnType<typeof vi.fn>;
};

const renderSignup = () =>
    render(
        <MemoryRouter>
            <SignupPage />
        </MemoryRouter>
    );

const submitSignup = async (user: ReturnType<typeof userEvent.setup>) => {
    const form = screen.getByRole('form', { name: '회원가입' });
    await user.click(within(form).getByRole('button', { name: '가입하기' }));
};

/** 이메일만 호출부가 정한다. 형식 오류를 따로 재려면 그 칸만 갈아끼워야 한다. */
const fillForm = async (user: ReturnType<typeof userEvent.setup>, email: string) => {
    await user.type(screen.getByLabelText('아이디'), 'rangssu');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.type(screen.getByLabelText('이름'), '김랑수');
    await user.type(screen.getByLabelText('닉네임'), '랑수');
    await user.type(screen.getByLabelText('이메일'), email);
};

describe('SignupPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('빈 칸마다 그 칸 아래에 오류를 보여준다', async () => {
        const user = userEvent.setup();
        renderSignup();

        await submitSignup(user);

        expect(screen.getByLabelText('아이디')).toHaveAccessibleDescription('아이디를 입력해주세요.');
        expect(screen.getByLabelText('비밀번호')).toHaveAccessibleDescription('비밀번호를 입력해주세요.');
        expect(screen.getByLabelText('이름')).toHaveAccessibleDescription('이름을 입력해주세요.');
        expect(screen.getByLabelText('닉네임')).toHaveAccessibleDescription('닉네임을 입력해주세요.');
        expect(screen.getByLabelText('이메일')).toHaveAccessibleDescription('이메일을 입력해주세요.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('이메일 형식 오류는 이메일 칸에만 붙는다', async () => {
        const user = userEvent.setup();
        renderSignup();

        await fillForm(user, 'not-an-email');
        await submitSignup(user);

        expect(screen.getByLabelText('이메일')).toHaveAccessibleDescription(
            '올바른 이메일 형식이 아닙니다.'
        );
        expect(screen.getAllByRole('alert')).toHaveLength(1);
        expect(api.post).not.toHaveBeenCalled();
    });

    it('검증을 통과하면 가입 요청을 보낸다', async () => {
        const user = userEvent.setup();
        api.post.mockResolvedValue({ data: {} });
        renderSignup();

        await fillForm(user, 'rangssu@test.com');
        await submitSignup(user);

        expect(api.post).toHaveBeenCalledWith('/users', {
            loginId: 'rangssu',
            password: 'password123',
            name: '김랑수',
            nickname: '랑수',
            email: 'rangssu@test.com',
        });
    });

    it('가입 화면에 들어오면 남아 있던 인증 정보를 지운다', async () => {
        localStorage.setItem('accessToken', 'stale');
        localStorage.setItem('userId', '1');
        localStorage.setItem('role', 'USER');

        renderSignup();

        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('userId')).toBeNull();
        expect(localStorage.getItem('role')).toBeNull();
    });
});
