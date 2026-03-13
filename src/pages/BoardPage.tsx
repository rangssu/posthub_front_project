// src/pages/BoardPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

// 백엔드 BoardResponse 데이터 모양에 완벽하게 맞춘 타입 정의
interface Board {
    id: number;
    boardName: string; // 👇 [수정완료] tabName -> boardName 으로 변경!
}

interface Post {
    id: number;
    title: string;
    viewCount: number;
    createdAt: string;
    content: string;
}

const BoardPage = () => {
    const navigate = useNavigate();
    const [boards, setBoards] = useState<Board[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);

    // 1. 로그인 상태 확인 (토큰이 있는지)
    const isLoggedIn = !!localStorage.getItem('accessToken');

    // 2. 로그아웃 기능
    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        alert('로그아웃 되었습니다.');
        window.location.reload();
    };

    // 3. 페이지 렌더링 시 게시판(탭) 목록 불러오기
    const fetchBoards = async () => {
        try {
            const response = await api.get('/boards');
            setBoards(response.data);
            if (response.data.length > 0) {
                setActiveBoardId((prev) => prev ? prev : response.data[0].id); // 첫 번째 탭 자동 선택
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

    // 4. 활성화된 탭이 바뀔 때마다 해당 게시판의 글 목록 불러오기
    useEffect(() => {
        if (activeBoardId === null) return;
        const fetchPosts = async () => {
            try {
                const response = await api.get(`/boards/${activeBoardId}/posts`);
                setPosts(response.data);
            } catch (error) {
                console.error('게시글 로딩 실패', error);
            }
        };
        fetchPosts();
    }, [activeBoardId]);

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
            alert('게시판 생성에 실패했습니다. (권한 확인 필요)');
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
            alert('게시판 수정에 실패했습니다.');
        }
    };

    // [추가] 게시판 삭제 기능
    const handleDeleteBoard = async (boardId: number, boardName: string) => {
        if (!window.confirm(`'${boardName}' 게시판을 정말 삭제하시겠습니까?\n안에 있는 모든 게시글이 함께 삭제됩니다!`)) return;

        try {
            await api.delete(`/boards/${boardId}`);
            alert('게시판이 삭제되었습니다.');
            if (activeBoardId === boardId) setActiveBoardId(null);
            fetchBoards(); // 목록 새로고침
        } catch (error) {
            console.error('게시판 삭제 실패', error);
            alert('게시판 삭제에 실패했습니다.');
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

                        {/* 로그인 상태 & 현재 선택된 탭에만 수정/삭제 버튼 노출 */}
                        {isLoggedIn && activeBoardId === board.id && (
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

                {/* 로그인 상태일 때 '+ 새 게시판' 생성 버튼 */}
                {isLoggedIn && (
                    <button
                        onClick={handleCreateBoard}
                        className="px-4 py-2 text-sm font-bold text-gray-500 bg-white border border-dashed border-gray-400 rounded-md whitespace-nowrap hover:bg-gray-50 hover:text-gray-800"
                    >
                        + 새 게시판
                    </button>
                )}
            </div>

            {/* 게시글 목록 테이블 */}
            <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">제목</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">작성일</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">조회수</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {posts.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="px-6 py-10 text-center text-gray-500">작성된 게시글이 없습니다.</td>
                        </tr>
                    ) : (
                        posts.map((post) => (
                            <tr
                                key={post.id}
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => navigate(`/posts/${post.id}`)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="font-medium text-gray-900">{post.title}</span>
                                </td>
                                <td className="px-6 py-4 text-center text-gray-500 whitespace-nowrap">
                                    {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-center text-gray-500 whitespace-nowrap">
                                    {post.viewCount}
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

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