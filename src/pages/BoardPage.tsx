// src/pages/BoardPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

// 백엔드 데이터 모양에 맞춘 타입 정의
interface Board {
    id: number;
    tabName: string; // 백엔드 BoardResponse의 필드명에 맞춤
}

interface Post {
    id: number;
    title: string;
    viewCount: number;
    createdAt: string; // 백엔드 PostResponse 필드명에 맞춤
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
        navigate('/login');
    };

    // 3. 페이지 렌더링 시 게시판(탭) 목록 불러오기
    useEffect(() => {
        const fetchBoards = async () => {
            try {
                const response = await api.get('/boards');
                setBoards(response.data);
                if (response.data.length > 0) {
                    setActiveBoardId(response.data[0].id); // 첫 번째 탭 자동 선택
                }
            } catch (error) {
                console.error('게시판 목록 로딩 실패', error);
            }
        };
        fetchBoards();
    }, []);

    // 4. 활성화된 탭이 바뀔 때마다 해당 게시판의 글 목록 불러오기
    useEffect(() => {
        if (activeBoardId === null) return;
        const fetchPosts = async () => {
            try {
                /**
                 * [수정됨] 백엔드의 PostController 형식에 맞게 URL 변경
                 * 이전: /posts?boardId=${activeBoardId}
                 * 현재: /boards/${activeBoardId}/posts (@GetMapping("/boards/{boardId}/posts"))
                 */
                const response = await api.get(`/boards/${activeBoardId}/posts`);
                setPosts(response.data);
            } catch (error) {
                console.error('게시글 로딩 실패', error);
            }
        };
        fetchPosts();
    }, [activeBoardId]);

    return (
        <div className="max-w-4xl px-4 py-8 mx-auto">
            {/* 헤더 영역 (로고 & 로그아웃 버튼) */}
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

            {/* 게시판 탭 버튼들 */}
            <div className="flex pb-2 mb-6 space-x-4 border-b">
                {boards.length === 0 && <span className="text-gray-500">게시판을 불러오는 중이거나 없습니다.</span>}
                {boards.map((board) => (
                    <button
                        key={board.id}
                        onClick={() => setActiveBoardId(board.id)}
                        className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                            activeBoardId === board.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {board.tabName}
                    </button>
                ))}
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
                                /**
                                 * [추가됨] 행을 클릭하면 해당 게시글의 상세 페이지로 이동합니다.
                                 * 백틱(`)을 사용해 post.id 값을 URL 주소에 동적으로 삽입합니다.
                                 */
                                onClick={() => navigate(`/posts/${post.id}`)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="font-medium text-gray-900">{post.title}</span>
                                </td>
                                <td className="px-6 py-4 text-center text-gray-500 whitespace-nowrap">
                                    {new Date(post.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-center text-gray-500 whitespace-nowrap">{post.viewCount}</td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {/* 👇 [수정됨] 글쓰기 버튼 클릭 시 현재 선택된 게시판 번호를 들고 글쓰기 페이지로 이동 */}
            {isLoggedIn && (
                <div className="flex justify-end mt-4">
                    <button
                        onClick={() => {
                            if (activeBoardId) {
                                navigate(`/boards/${activeBoardId}/write`);
                            }
                        }}
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