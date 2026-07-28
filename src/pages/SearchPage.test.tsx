import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchPage from './SearchPage';
import { bootPage, makePosts } from '../test/fixtures';

vi.mock('../api/axios', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    errorMessage: (_e: unknown, fallback: string) => fallback,
}));

const api = (await import('../api/axios')).default as unknown as {
    get: ReturnType<typeof vi.fn>;
};

const renderSearchPage = (search: string) =>
    render(
        <MemoryRouter initialEntries={[`/search${search}`]}>
            <SearchPage />
        </MemoryRouter>
    );

describe('SearchPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('검색어를 붙여 검색 API를 부르고 결과를 그린다', async () => {
        api.get.mockResolvedValue(bootPage(makePosts(2, 1), 2, 1));

        renderSearchPage('?q=스프링');

        expect(await screen.findByText('게시글 1')).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/posts/search', {
            params: { q: '스프링', page: 0, size: 10 },
        });
    });

    it('결과가 없으면 안내 문구를 보여준다', async () => {
        api.get.mockResolvedValue(bootPage([], 0, 0));

        renderSearchPage('?q=없는검색어');

        expect(await screen.findByText("'없는검색어'에 대한 검색 결과가 없습니다.")).toBeInTheDocument();
    });

    it('백엔드가 거절하면 그 사유를 화면에 보여준다', async () => {
        api.get.mockRejectedValue({ response: { status: 400 } });

        renderSearchPage('?q=가');

        expect(await screen.findByText('검색에 실패했습니다.')).toBeInTheDocument();
    });

    it('검색어가 없으면 API를 부르지 않는다', () => {
        renderSearchPage('');

        expect(api.get).not.toHaveBeenCalled();
        expect(screen.getByText('검색어를 입력해 주세요.')).toBeInTheDocument();
    });

    it('URL의 page를 그대로 요청에 싣는다', async () => {
        api.get.mockResolvedValue(bootPage(makePosts(10, 11), 30, 3));

        renderSearchPage('?q=스프링&page=1');

        expect(await screen.findByText('게시글 11')).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/posts/search', {
            params: { q: '스프링', page: 1, size: 10 },
        });
    });
});
