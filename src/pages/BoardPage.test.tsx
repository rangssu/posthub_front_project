import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPage from './BoardPage';
import { bootPage, makePosts } from '../test/fixtures';

/**
 * 백엔드 응답 형식과 화면의 계약을 검증한다.
 *
 * 이 테스트가 있는 이유:
 * 백엔드가 Spring Boot 4로 올라가면서 Page 직렬화 형식이
 * { content, totalPages } 에서 { content, page: { totalPages } } 로 바뀌었는데,
 * 화면은 루트에서 totalPages를 계속 읽고 있었다.
 * undefined가 되면서 페이징 영역이 통째로 사라졌는데 에러는 하나도 나지 않아,
 * 브라우저로 직접 열어보기 전까지 아무도 몰랐다.
 */

vi.mock('../api/axios', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    errorMessage: (_e: unknown, fallback: string) => fallback,
}));

const api = (await import('../api/axios')).default as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
};

const board = { id: 1, boardName: '자유게시판' };

const renderBoardPage = () => render(<BoardPage />, { wrapper: MemoryRouter });

describe('BoardPage 페이징', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('글이 한 페이지를 넘으면 페이지 버튼을 그린다', async () => {
        api.get.mockImplementation((url: string) => {
            if (url === '/boards') return Promise.resolve({ data: [board] });
            return Promise.resolve(bootPage(makePosts(10, 6), 15, 2));
        });

        renderBoardPage();

        // 글이 먼저 그려지는 걸 기다린 뒤 페이징을 확인한다
        expect(await screen.findByText('게시글 15')).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: '2' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument();
    });

    it('글이 한 페이지에 다 들어가면 페이지 버튼은 1개만 그린다', async () => {
        api.get.mockImplementation((url: string) => {
            if (url === '/boards') return Promise.resolve({ data: [board] });
            return Promise.resolve(bootPage(makePosts(3, 1), 3, 1));
        });

        renderBoardPage();

        expect(await screen.findByRole('button', { name: '1' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument();
    });

    it('page 정보가 없는 응답에도 터지지 않는다', async () => {
        api.get.mockImplementation((url: string) => {
            if (url === '/boards') return Promise.resolve({ data: [board] });
            return Promise.resolve({ data: { content: makePosts(2, 1) } });
        });

        renderBoardPage();

        expect(await screen.findByText('게시글 1')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '다음' })).not.toBeInTheDocument();
    });

    it('탈퇴한 회원의 글은 작성자가 탈퇴한 사용자로 보인다', async () => {
        const posts = makePosts(1, 1);
        posts[0].nickname = '탈퇴한 사용자';

        api.get.mockImplementation((url: string) => {
            if (url === '/boards') return Promise.resolve({ data: [board] });
            return Promise.resolve(bootPage(posts, 1, 1));
        });

        renderBoardPage();

        expect(await screen.findByText('탈퇴한 사용자')).toBeInTheDocument();
    });
});

/**
 * 리프레시 토큰은 httpOnly 쿠키라 프론트가 지울 수 없다.
 * 서버에 알리지 않으면 로그아웃한 뒤에도 그 쿠키로 새 액세스 토큰을 받아갈 수 있다.
 */
describe('BoardPage 로그아웃', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.stubGlobal('alert', vi.fn());
        // jsdom에서는 location.reload가 구현돼 있지 않아 호출하면 에러가 난다.
        vi.stubGlobal('location', { ...window.location, reload: vi.fn() });

        api.get.mockImplementation((url: string) => {
            if (url === '/boards') return Promise.resolve({ data: [board] });
            return Promise.resolve(bootPage(makePosts(1, 1), 1, 1));
        });
        localStorage.setItem('accessToken', 'token');
        localStorage.setItem('userId', '1');
        localStorage.setItem('role', 'USER');
    });

    const clickLogout = async () => {
        renderBoardPage();
        await userEvent.click(await screen.findByRole('button', { name: '로그아웃' }));
    };

    it('서버에 로그아웃을 알리고 인증 정보를 지운다', async () => {
        api.post.mockResolvedValue({ status: 204 });

        await clickLogout();

        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/logout'));
        expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('서버 로그아웃이 실패해도 인증 정보는 지운다', async () => {
        // 서버가 죽었다고 로그아웃이 막히면 안 된다.
        api.post.mockRejectedValue(new Error('network'));

        await clickLogout();

        await waitFor(() => expect(localStorage.getItem('accessToken')).toBeNull());
    });
});
