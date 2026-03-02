// src/pages/PostEditPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../api/axios';

const PostEditPage = () => {
    // URL에서 수정할 게시글 번호를 가져옵니다.
    const { postId } = useParams();
    const navigate = useNavigate();

    // 상세 페이지에서 '수정' 버튼을 누를 때 넘겨준 기존 게시글 데이터를 받아옵니다.
    const location = useLocation();
    const existingPost = location.state?.post;

    // 제목과 내용을 관리하는 상태입니다. (기존 데이터가 있으면 그걸 초기값으로 씁니다)
    const [title, setTitle] = useState(existingPost?.title || '');
    const [content, setContent] = useState(existingPost?.content || '');

    // 만약 새로고침 등으로 기존 데이터가 날아갔다면 다시 서버에서 불러옵니다.
    useEffect(() => {
        if (!existingPost) {
            const fetchPost = async () => {
                try {
                    const response = await api.get(`/posts/${postId}`);
                    setTitle(response.data.title);
                    setContent(response.data.content);
                } catch (error) {
                    alert('데이터를 불러올 수 없습니다.');
                    navigate(-1);
                }
            };
            fetchPost();
        }
    }, [postId, existingPost, navigate]);

    // 폼이 제출될 때(수정 완료 버튼 클릭 시) 실행되는 함수입니다.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !content.trim()) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }

        try {
            /**
             * [공부 포인트] 백엔드 글 수정 API 호출
             * 수정해주신 백엔드 컨트롤러에 맞춰 @PutMapping("/posts/{postId}") 로 요청을 보냅니다.
             */
            await api.put(`/posts/${postId}`, {
                title: title,
                content: content
            });

            alert('게시글이 성공적으로 수정되었습니다.');
            navigate(`/posts/${postId}`); // 수정이 끝나면 다시 상세 페이지로 돌아갑니다.
        } catch (error) {
            console.error('글 수정 에러:', error);
            alert('글 수정에 실패했습니다.');
        }
    };

    return (
        <div className="max-w-4xl px-4 py-8 mx-auto">
            <h1 className="mb-6 text-2xl font-bold">게시글 수정하기</h1>

            <form onSubmit={handleSubmit} className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="mb-4">
                    <label className="block mb-2 text-sm font-bold text-gray-700">제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow-appearance-none focus:outline-none focus:shadow-outline"
                    />
                </div>

                <div className="mb-6">
                    <label className="block mb-2 text-sm font-bold text-gray-700">내용</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        className="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow-appearance-none focus:outline-none focus:shadow-outline resize-none"
                    />
                </div>

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
                        수정 완료
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PostEditPage;