// src/pages/BoardPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import PostTable from '../components/PostTable';
import type { PostSummary } from '../types/post';
import type { PageResponse } from '../types/page';

// 백엔드 BoardResponse 데이터 모양에 완벽하게 맞춘 타입 정의
interface Board {
    id: number;
    boardName: string; // 👇 [수정완료] tabName -> boardName 으로 변경!
}

/** 한 페이지에 보여줄 글 수. 백엔드가 50을 넘는 요청은 잘라내므로 그 안에서 정한다. */
const PAGE_SIZE = 10;

const BoardPage = () => {
    const navigate = useNavigate();
    const [boards, setBoards] = useState<Board[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
    const [posts, setPosts] = useState<PostSummary[]>([]);

    // 👇 [추가] 프론트 페이징 처리를 위한 상태 추가
    const [currentPage, setCurrentPage] = useState<number>(0); // 스프링은 0페이지부터 시작
    const [totalPages, setTotalPages] = useState<number>(0);

    // 1. 로그인 상태 확인 (토큰이 있는지)
    const isLoggedIn = !!localStorage.getItem('accessToken');
    // 게시판 관리는 관리자만 가능합니다. 백엔드도 ROLE_ADMIN을 요구하므로 UI만 숨기는 게 아닙니다.
    const isAdmin = localStorage.getItem('role') === 'ADMIN';

    // 2. 로그아웃 기능
    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('role');
        alert('로그아웃 되었습니다.');
        window.location.reload();
    };

    // 3. 페이지 렌더링 시 게시판(탭) 목록 불러오기
    const fetchBoards = async () => {
        try {
            const response = await api.get('/boards');

            // [에러 해결] 백엔드에서 배열을 바로 주는지, 객체로 포장해서 주는지 확인하여 배열만 안전하게 추출합니다.
            // 데이터가 없거나 형식이 맞지 않을 경우를 대비해 빈 배열([])을 기본값으로 설정합니다.
            const boardsData = Array.isArray(response.data) ? response.data : (response.data.content || []);

            setBoards(boardsData);

            // 추출한 배열의 길이를 기준으로 탭을 설정합니다.
            if (boardsData.length > 0) {
                setActiveBoardId((prev) => prev ? prev : boardsData[0].id); // 첫 번째 탭 자동 선택
            } else {
                setActiveBoardId(null);
                setPosts([]);
            }
        } catch (error) {
            console.error('게시판 목록 로딩 실패', error);
        }
    };

    useEffect(() => {
        fetchBoards();
    }, []);

    // 👇 [추가] 탭(activeBoardId)이 바뀔 때마다 페이지를 0(첫 페이지)으로 초기화합니다.
    useEffect(() => {
        if (activeBoardId !== null) {
            setCurrentPage(0);
        }
    }, [activeBoardId]);

    // 4. 활성화된 탭이 바뀌거나 페이지 번호(currentPage)가 바뀔 때마다 해당 게시판의 글 목록 불러오기
    useEffect(() => {
        if (activeBoardId === null) return;
        const fetchPosts = async () => {
            try {
                // size는 백엔드가 50으로 자르므로 그 아래로 요청합니다.
                // 정렬은 백엔드가 최신순으로 고정하고 있어 sort는 보내지 않습니다.
                const response = await api.get<PageResponse<PostSummary>>(
                    `/boards/${activeBoardId}/posts?page=${currentPage}&size=${PAGE_SIZE}`
                );

                // [에러 해결] 페이징 처리된 객체({ content: [...] })가 올 경우를 대비해 알맹이만 꺼냅니다.
                // 배열이 아니면 map 함수에서 에러가 나므로, 반드시 배열 형태만 상태에 저장되도록 처리합니다.
                if (response.data && response.data.content) {
                    setPosts(response.data.content);
                    setTotalPages(response.data.page?.totalPages ?? 0);
                } else {
                    const postsData = Array.isArray(response.data) ? response.data : [];
                    setPosts(postsData);
                    setTotalPages(1);
                }
            } catch (error) {
                console.error('게시글 로딩 실패', error);
            }
        };
        fetchPosts();
    }, [activeBoardId, currentPage]); // 👈 [추가] currentPage가 바뀔 때도 useEffect가 다시 실행되도록 추가

    // [추가] 게시판 생성 기능
    const handleCreateBoard = async () => {
        const newBoardName = window.prompt('새로 만들 게시판의 이름을 입력하세요:');
        if (!newBoardName || !newBoardName.trim()) return;

        try {
            // 👇 [수정완료] 백엔드로 보낼 때도 boardName 이라는 짝표로 보냅니다!
            await api.post('/boards', { boardName: newBoardName.trim() });
            alert('게시판이 생성되었습니다!');
            fetchBoards(); // 목록 새로고침
        } catch (error) {
            console.error('게시판 생성 실패', error);
            alert(errorMessage(error, '게시판 생성에 실패했습니다.'));
        }
    };

    // [추가] 게시판 이름 수정 기능
    const handleUpdateBoard = async (boardId: number, currentName: string) => {
        const newBoardName = window.prompt('수정할 게시판 이름을 입력하세요:', currentName);
        if (!newBoardName || newBoardName.trim() === currentName) return;

        try {
            // 👇 [수정완료] 수정할 때도 boardName 사용!
            await api.put(`/boards/${boardId}`, { boardName: newBoardName.trim() });
            alert('게시판 이름이 변경되었습니다.');
            fetchBoards(); // 목록 새로고침
        } catch (error) {
            console.error('게시판 수정 실패', error);
            alert(errorMessage(error, '게시판 수정에 실패했습니다.'));
        }
    };

    // [추가] 게시판 삭제 기능
    const handleDeleteBoard = async (boardId: number, boardName: string) => {
        if (!window.confirm(`'${boardName}' 게시판을 정말 삭제하시겠습니까?\n게시글이 하나라도 남아 있으면 삭제되지 않습니다.`)) return;

        try {
            await api.delete(`/boards/${boardId}`);
            alert('게시판이 삭제되었습니다.');
            if (activeBoardId === boardId) setActiveBoardId(null);
            fetchBoards(); // 목록 새로고침
        } catch (error) {
            console.error('게시판 삭제 실패', error);
            alert(errorMessage(error, '게시판 삭제에 실패했습니다.'));
        }
    };

    return (
        <div className="max-w-4xl px-4 py-8 mx-auto">
            {/* 헤더 영역 */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-800">PostHub</h1>
                {isLoggedIn ? (
                    <button onClick={handleLogout} className="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded hover:bg-red-600">
                        로그아웃
                    </button>
                ) : (
                    <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-bold text-white bg-blue-500 rounded hover:bg-blue-600">
                        로그인하기
                    </button>
                )}
            </div>

            {/* 얇은 테두리와 이름이 명확히 보이는 게시판 탭 영역 */}
            <div className="flex items-center pb-4 mb-6 space-x-3 border-b overflow-x-auto">
                {boards.length === 0 && <span className="text-sm text-gray-500">생성된 게시판이 없습니다. 우측 버튼을 눌러 추가해보세요!</span>}

                {boards.map((board) => (
                    <div
                        key={board.id}
                        className={`flex items-center px-4 py-2 border rounded-md transition-colors ${
                            activeBoardId === board.id
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {/* 👇 [수정완료] 화면에 띄울 때도 board.boardName 사용! */}
                        <span
                            className="font-medium cursor-pointer whitespace-nowrap"
                            onClick={() => setActiveBoardId(board.id)}
                        >
                            {board.boardName}
                        </span>

                        {/* 관리자 & 현재 선택된 탭에만 수정/삭제 버튼 노출 */}
                        {isAdmin && activeBoardId === board.id && (
                            <div className="flex items-center ml-3 space-x-2 border-l border-gray-300 pl-2">
                                <button
                                    onClick={() => handleUpdateBoard(board.id, board.boardName)}
                                    className="text-xs text-gray-400 hover:text-blue-600 transition"
                                    title="게시판 이름 수정"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleDeleteBoard(board.id, board.boardName)}
                                    className="text-xs text-gray-400 hover:text-red-600 transition"
                                    title="게시판 삭제"
                                >
                                    ❌
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* 관리자일 때만 '+ 새 게시판' 생성 버튼 */}
                {isAdmin && (
                    <button
                        onClick={handleCreateBoard}
                        className="px-4 py-2 text-sm font-bold text-gray-500 bg-white border border-dashed border-gray-400 rounded-md whitespace-nowrap hover:bg-gray-50 hover:text-gray-800"
                    >
                        + 새 게시판
                    </button>
                )}
            </div>

            {/* 게시글 목록 테이블 */}
            <PostTable
                posts={posts}
                emptyMessage="작성된 게시글이 없습니다."
                onRowClick={(postId) => navigate(`/posts/${postId}`)}
            />

            {/* 👇 [추가] 페이징 버튼 영역 (데이터가 있을 때만 렌더링) */}
            {totalPages > 0 && (
                <div className="flex items-center justify-center p-4 bg-white border-t border-gray-200 space-x-2">
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                        disabled={currentPage === 0}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        이전
                    </button>

                    {/* Array.from을 이용해 totalPages 숫자만큼 버튼을 생성합니다. */}
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`px-3 py-1 text-sm font-medium border rounded-md ${
                                currentPage === i
                                    ? 'bg-blue-50 text-blue-600 border-blue-500' // 현재 선택된 페이지
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' // 선택되지 않은 페이지
                            }`}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))}
                        disabled={currentPage === totalPages - 1}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        다음
                    </button>
                </div>
            )}

            {/* 글쓰기 버튼 */}
            {isLoggedIn && activeBoardId && (
                <div className="flex justify-end mt-4">
                    <button
                        onClick={() => navigate(`/boards/${activeBoardId}/write`)}
                        className="px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                        글쓰기
                    </button>
                </div>
            )}
        </div>
    );
};

export default BoardPage;