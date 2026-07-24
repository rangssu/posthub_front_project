import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPage from './BoardPage';

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
};

const board = { id: 1, boardName: '자유게시판' };

const makePosts = (count: number, startId: number) =>
    Array.from({ length: count }, (_, i) => ({
        id: startId + i,
        title: `게시글 ${startId + i}`,
        viewCount: 0,
        createdAt: '2026-07-24T10:00:00',
        content: '본문',
        nickname: '작성자',
    }));

/** 실제 백엔드(Spring Boot 4)가 내려주는 목록 응답 형식 */
const bootPage = (posts: ReturnType<typeof makePosts>, totalElements: number, totalPages: number) => ({
    data: {
        content: posts,
        page: { size: 10, number: 0, totalElements, totalPages },
    },
});

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
