import { render, screen, within } from '@testing-library/react';
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
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
};
const mockDelete = api.delete;

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
 * 로그인/로그아웃은 Task 6에서 Header(공통 헤더)로 옮겨갔다. BoardPage는 더 이상
 * 로그아웃 버튼도 handleLogout도 갖지 않으므로, 그 동작을 검증하던 테스트도
 * Header 쪽 책임이 됐다. 여기서는 BoardPage 고유의 동작(게시판 삭제 다이얼로그)만 다룬다.
 *
 * window.confirm은 동기라 삭제 버튼을 누르면 그 자리에서 바로 API가 나갔다.
 * Dialog는 비동기라 "삭제 버튼 클릭 → 다이얼로그의 삭제 버튼 클릭"이라는 두 단계로
 * 쪼개졌다. 이 사이에 API가 나가지 않는지, 취소하면 아예 나가지 않는지를 검증한다.
 */
describe('BoardPage 게시판 삭제', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        api.get.mockImplementation((url: string) => {
            if (url === '/boards') return Promise.resolve({ data: [board] });
            return Promise.resolve(bootPage(makePosts(1, 1), 1, 1));
        });
        localStorage.setItem('accessToken', 'token');
        localStorage.setItem('role', 'ADMIN');
    });

    it('게시판 삭제는 확인 다이얼로그를 거친다', async () => {
        const user = userEvent.setup();

        renderBoardPage(); // 기존 헬퍼

        // 관리자에게만 보이는 삭제 버튼
        await user.click(await screen.findByRole('button', { name: '게시판 삭제' }));

        // 이 시점에는 아직 API가 나가지 않아야 한다.
        expect(mockDelete).not.toHaveBeenCalled();

        // 페이지의 삭제 버튼과 이름이 같을 수 있어 다이얼로그 안으로 범위를 좁힌다.
        const dialog = screen.getByRole('dialog');
        await user.click(within(dialog).getByRole('button', { name: '삭제' }));
        expect(mockDelete).toHaveBeenCalledWith('/boards/1');
    });

    it('삭제 다이얼로그에서 취소하면 아무것도 지우지 않는다', async () => {
        const user = userEvent.setup();

        renderBoardPage();

        await user.click(await screen.findByRole('button', { name: '게시판 삭제' }));

        const dialog = screen.getByRole('dialog');
        await user.click(within(dialog).getByRole('button', { name: '취소' }));

        expect(mockDelete).not.toHaveBeenCalled();
    });
});
