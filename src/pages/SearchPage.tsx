import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import Layout from '../components/Layout';
import PostTable from '../components/PostTable';
import Pagination from '../components/Pagination';
import { Button } from '../components/ui/Button';
import { PAGE_SIZE } from '../constants/pagination';
import type { PageResponse } from '../types/page';
import type { PostSummary } from '../types/post';

/**
 * 게시글 검색 결과.
 *
 * 검색어와 페이지를 URL 쿼리스트링에 둔다. 상태를 URL에 두면
 * 새로고침·링크 공유·뒤로가기가 전부 그대로 동작한다.
 */
const SearchPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const query = searchParams.get('q') ?? '';
    const pageParam = Number(searchParams.get('page') ?? '0');
    // 잘못된 URL(?page=abc)의 NaN이 요청과 페이지 버튼까지 흘러가지 않게 막는다.
    const currentPage = Number.isInteger(pageParam) && pageParam >= 0 ? pageParam : 0;

    const [posts, setPosts] = useState<PostSummary[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        /*
         * 검색어가 없으면 아무것도 하지 않는다. 예전에는 여기서 결과 상태를 전부
         * 0으로 되돌렸는데, effect 안에서 setState를 동기 호출하는 꼴이라
         * react-hooks/set-state-in-effect에 걸렸다. 아래 렌더가 query가 있을 때만
         * 결과를 그리므로 되돌릴 필요도 없었다.
         */
        if (!query) return;

        // 페이지를 빠르게 넘기면 늦게 도착한 이전 응답이 새 결과를 덮을 수 있다.
        let ignore = false;

        const search = async () => {
            setError('');
            try {
                const response = await api.get<PageResponse<PostSummary>>('/posts/search', {
                    params: { q: query, page: currentPage, size: PAGE_SIZE },
                });
                if (ignore) return;
                setPosts(response.data.content ?? []);
                setTotalPages(response.data.page?.totalPages ?? 0);
                setTotalElements(response.data.page?.totalElements ?? 0);
            } catch (e) {
                if (ignore) return;
                // 검색은 실패가 잦은 동작이라 alert 대신 화면에 남긴다.
                setPosts([]);
                setTotalPages(0);
                setTotalElements(0);
                setError(errorMessage(e, '검색에 실패했습니다.'));
            }
        };

        search();

        return () => {
            ignore = true;
        };
    }, [query, currentPage]);

    const goToPage = (page: number) => setSearchParams({ q: query, page: String(page) });

    return (
        <Layout>
            <div className="flex items-center justify-between mb-6">
                {/* 제목이 아예 없어 무슨 화면인지 알 수 없었다. */}
                <h1 className="text-xl font-semibold text-fg">검색 결과</h1>
                <Button variant="ghost" size="sm" onClick={() => navigate('/boards')}>
                    &larr; 목록으로 돌아가기
                </Button>
            </div>

            {/*
             * 검색창은 헤더에 있다. 여기 하나를 더 두면 한 화면에 검색창이 둘이 된다.
             * 헤더가 URL의 q를 읽어 현재 검색어를 채운다.
             */}
            {!query && <p className="py-10 text-center text-fg-muted">검색어를 입력해 주세요.</p>}

            {query && error && (
                <p role="alert" className="py-10 text-center text-danger">{error}</p>
            )}

            {query && !error && (
                <>
                    <p className="mb-4 text-sm text-fg-muted">
                        '{query}' 검색 결과 {totalElements}건
                    </p>

                    <PostTable
                        posts={posts}
                        emptyMessage={`'${query}'에 대한 검색 결과가 없습니다.`}
                        onRowClick={(postId) => navigate(`/posts/${postId}`)}
                    />

                    <Pagination currentPage={currentPage} totalPages={totalPages} onChange={goToPage} />
                </>
            )}
        </Layout>
    );
};

export default SearchPage;
