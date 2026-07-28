import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SearchBox from './SearchBox';

/**
 * 검색 제출이 어디로 갔는지 보려고 목적지 화면에서 검색어를 그대로 그린다.
 *
 * MemoryRouter는 실제 window.location을 바꾸지 않으므로
 * window.location.search가 아니라 useSearchParams로 읽어야 한다.
 */
const SearchResultStub = () => {
    const [params] = useSearchParams();
    return <div>검색 이동: {params.get('q')}</div>;
};

const renderSearchBox = (initialQuery?: string) =>
    render(
        <MemoryRouter initialEntries={['/boards']}>
            <Routes>
                <Route path="/boards" element={<SearchBox initialQuery={initialQuery} />} />
                <Route path="/search" element={<SearchResultStub />} />
            </Routes>
        </MemoryRouter>
    );

const searchInput = () => screen.getByRole('searchbox', { name: '검색어' });

describe('SearchBox', () => {
    it('2글자 미만이면 이동하지 않고 사유를 보여준다', async () => {
        renderSearchBox();

        await userEvent.type(searchInput(), '가');
        await userEvent.click(screen.getByRole('button', { name: '검색' }));

        expect(screen.getByText('검색어는 2글자 이상이어야 합니다.')).toBeInTheDocument();
        expect(screen.queryByText(/검색 이동/)).not.toBeInTheDocument();
    });

    it('2글자 이상이면 검색 결과로 이동한다', async () => {
        renderSearchBox();

        await userEvent.type(searchInput(), '스프링');
        await userEvent.click(screen.getByRole('button', { name: '검색' }));

        expect(await screen.findByText(/검색 이동/)).toBeInTheDocument();
    });

    it('앞뒤 공백만 있는 입력은 이동하지 않는다', async () => {
        renderSearchBox();

        await userEvent.type(searchInput(), '   ');
        await userEvent.click(screen.getByRole('button', { name: '검색' }));

        expect(screen.getByText('검색어는 2글자 이상이어야 합니다.')).toBeInTheDocument();
    });

    it('initialQuery를 받으면 입력창을 그 값으로 채운다', () => {
        renderSearchBox('스프링');

        expect(searchInput()).toHaveValue('스프링');
    });
});
