import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import PostTable from '../components/PostTable';
import Pagination from '../components/Pagination';
import SearchBox from '../components/SearchBox';
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
    const currentPage = Number(searchParams.get('page') ?? '0');

    const [posts, setPosts] = useState<PostSummary[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!query) {
            setPosts([]);
            setTotalPages(0);
            setTotalElements(0);
            setError('');
            return;
        }

        const search = async () => {
            setError('');
            try {
                const response = await api.get<PageResponse<PostSummary>>('/posts/search', {
                    params: { q: query, page: currentPage, size: PAGE_SIZE },
                });
                setPosts(response.data.content ?? []);
                setTotalPages(response.data.page?.totalPages ?? 0);
                setTotalElements(response.data.page?.totalElements ?? 0);
            } catch (e) {
                // 검색은 실패가 잦은 동작이라 alert 대신 화면에 남긴다.
                setPosts([]);
                setTotalPages(0);
                setTotalElements(0);
                setError(errorMessage(e, '검색에 실패했습니다.'));
            }
        };

        search();
    }, [query, currentPage]);

    const goToPage = (page: number) => setSearchParams({ q: query, page: String(page) });

    return (
        <div className="max-w-4xl px-4 py-8 mx-auto">
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => navigate('/boards')}
                    className="text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                >
                    &larr; 목록으로 돌아가기
                </button>
            </div>

            <div className="mb-6">
                <SearchBox initialQuery={query} />
            </div>

            {!query && <p className="py-10 text-center text-gray-500">검색어를 입력해 주세요.</p>}

            {query && error && <p className="py-10 text-center text-red-500">{error}</p>}

            {query && !error && (
                <>
                    <p className="mb-4 text-sm text-gray-600">
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
        </div>
    );
};

export default SearchPage;
