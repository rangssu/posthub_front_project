// src/pages/PostWritePage.tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const PostWritePage = () => {
    // URL에서 어떤 게시판에 글을 쓸지 번호를 가져옵니다. (예: /boards/1/write 이면 boardId는 "1")
    const { boardId } = useParams();
    const navigate = useNavigate();

    // 사용자가 입력할 제목과 내용을 담을 상태(state)입니다.
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    // 폼이 제출될 때(작성 완료 버튼 클릭 시) 실행되는 함수입니다.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // 폼 제출 시 새로고침 방지

        // 빈 칸 검사 (간단한 유효성 검사)
        if (!title.trim() || !content.trim()) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }

        try {
            /**
             * [공부 포인트] 백엔드 글 작성 API 호출
             * 백엔드 PostController의 @PostMapping("/board/{boardId}/posts") 로 요청을 보냅니다.
             * 로그인할 때 발급받아 axios 인터셉터에 설정된 JWT 토큰이 자동으로 같이 날아갑니다.
             */
            await api.post(`/board/${boardId}/posts`, {
                title: title,
                content: content
            });

            alert('게시글이 성공적으로 등록되었습니다.');
            // 글 작성이 끝나면 게시판 메인 페이지로 돌아갑니다.
            navigate('/BoardPage');
        } catch (error) {
            console.error('글 작성 에러:', error);
            alert('글 작성에 실패했습니다.');
        }
    };

    return (
        <div className="max-w-4xl px-4 py-8 mx-auto">
            <h1 className="mb-6 text-2xl font-bold">새 글 작성하기</h1>

            {/* 글쓰기 폼 영역 */}
            <form onSubmit={handleSubmit} className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">

                {/* 제목 입력 영역 */}
                <div className="mb-4">
                    <label className="block mb-2 text-sm font-bold text-gray-700">제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="제목을 입력하세요"
                        className="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow-appearance-none focus:outline-none focus:shadow-outline"
                    />
                </div>

                {/* 내용 입력 영역 */}
                <div className="mb-6">
                    <label className="block mb-2 text-sm font-bold text-gray-700">내용</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="내용을 입력하세요"
                        rows={10} // 높이를 넉넉하게 설정
                        className="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow-appearance-none focus:outline-none focus:shadow-outline resize-none"
                    />
                </div>

                {/* 하단 버튼 영역 */}
                <div className="flex items-center justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 font-bold text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                        작성 완료
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PostWritePage;