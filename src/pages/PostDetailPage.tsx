// src/pages/PostDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

// 백엔드의 PostResponse 데이터 구조에 맞춘 타입 정의
interface PostDetail {
    id: number;
    title: string;
    content: string;
    viewCount: number;
    createdAt: string;
    boardId: number;
    userId: number; // 👇 [추가] 글 작성자 ID
}

// 백엔드의 CommentResponse 데이터 구조에 맞춘 타입 정의
interface CommentData {
    commentId: number;
    userId: number; // 👇 댓글 작성자 ID
    content: string;
    createAt: string;
    nickname: string; // 👇 [추가] 댓글 작성자 닉네임
}

const PostDetailPage = () => {
    const { postId } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState<PostDetail | null>(null);
    const [comments, setComments] = useState<CommentData[]>([]);
    const [newComment, setNewComment] = useState('');

    // 👇 [추가] 로컬스토리지에 저장된 '현재 로그인한 내 ID'를 가져옵니다.
    // 문자열로 저장되어 있으므로 Number()로 숫자로 바꿔서 비교합니다.
    const currentUserIdString = localStorage.getItem('userId');
    const myUserId = currentUserIdString ? Number(currentUserIdString) : null;

    useEffect(() => {
        const fetchPost = async () => {
            try {
                // 백엔드 단건 조회 API 호출
                const response = await api.get(`/posts/${postId}`);
                setPost(response.data);
            } catch (error) {
                alert('게시글을 불러올 수 없습니다.');
                navigate('/BoardPage');
            }
        };

        const fetchComments = async () => {
            try {
                // 백엔드 댓글 목록 API 호출
                const response = await api.get(`/posts/${postId}/comments`);
                setComments(response.data);
            } catch (error) {
                console.error('댓글 로딩 실패', error);
            }
        };

        fetchPost();
        fetchComments();
    }, [postId, navigate]);

    const handleDeletePost = async () => {
        if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
        try {
            await api.delete(`/posts/${postId}`);
            alert('게시글이 삭제되었습니다.');
            navigate('/BoardPage');
        } catch (error) {
            console.error('게시글 삭제 실패:', error);
            alert('게시글 삭제에 실패했습니다.');
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) {
            alert('댓글 내용을 입력해주세요.');
            return;
        }
        try {
            await api.post(`/posts/${postId}/comments`, {
                content: newComment
            });
            alert('댓글이 등록되었습니다.');
            setNewComment('');

            const response = await api.get(`/posts/${postId}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error('댓글 작성 실패:', error);
            alert('댓글 작성에 실패했습니다. 로그인 상태를 확인하세요.');
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        if (!window.confirm('댓글을 삭제하시겠습니까?')) return;
        try {
            await api.delete(`/comments/${commentId}`);
            alert('댓글이 삭제되었습니다.');
            setComments(comments.filter(c => c.commentId !== commentId));
        } catch (error) {
            console.error('댓글 삭제 실패:', error);
            alert('댓글 삭제에 실패했습니다.');
        }
    };

    if (!post) {
        return <div className="p-8 text-center text-gray-500">내용을 불러오는 중입니다...</div>;
    }

    return (
        <div className="max-w-4xl px-4 py-8 mx-auto">
            {/* 상단 버튼 영역 */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                >
                    &larr; 목록으로 돌아가기
                </button>

                {/* 👇 [핵심 변경점] 내 ID(myUserId)와 이 글의 작성자 ID(post.userId)가 같을 때만 버튼을 보여줍니다! */}
                {myUserId === post.userId && (
                    <div className="space-x-2">
                        <button
                            onClick={() => navigate(`/posts/${postId}/edit`, { state: { post } })}
                            className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            수정
                        </button>
                        <button
                            onClick={handleDeletePost}
                            className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
                        >
                            삭제
                        </button>
                    </div>
                )}
            </div>

            {/* 게시글 상세 박스 영역 */}
            <div className="p-8 mb-8 bg-white border border-gray-200 rounded-lg shadow-sm">
                <h1 className="pb-4 mb-4 text-3xl font-bold text-gray-900 border-b border-gray-200">
                    {post.title}
                </h1>
                <div className="flex justify-between mb-8 text-sm text-gray-500">
                    <span>조회수: {post.viewCount}</span>
                    <span>작성일: {new Date(post.createdAt).toLocaleString()}</span>
                </div>
                <div className="leading-relaxed text-gray-800 whitespace-pre-wrap">
                    {post.content}
                </div>
            </div>

            {/* 댓글 UI 영역 시작 */}
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-gray-800">댓글</h3>

                {/* 댓글 작성 폼 (로그인한 사람만 보이게 하려면 {myUserId && (...)} 로 감싸도 좋습니다) */}
                <form onSubmit={handleCommentSubmit} className="flex flex-col mb-6">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="댓글을 남겨보세요."
                        className="w-full p-3 mb-2 text-gray-700 border border-gray-300 rounded resize-none focus:outline-none focus:border-blue-500"
                        rows={3}
                    />
                    <div className="flex justify-end">
                        <button type="submit" className="px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700">
                            댓글 등록
                        </button>
                    </div>
                </form>

                {/* 댓글 목록 출력 영역 */}
                <div className="space-y-4">
                    {comments.length === 0 ? (
                        <p className="py-4 text-center text-gray-500">작성된 댓글이 없습니다.</p>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.commentId} className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded">
                                <div className="flex flex-col">
                                    {/* 👇 [추가] 댓글 작성자의 닉네임을 보여줍니다. */}
                                    <span className="mb-1 text-sm font-bold text-gray-900">
                                        {comment.nickname}
                                    </span>
                                    <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                                    <span className="mt-2 text-xs text-gray-400">
                                        {comment.createAt ? new Date(comment.createAt).toLocaleString() : ''}
                                    </span>
                                </div>

                                {/* 👇 [핵심 변경점] 내 ID(myUserId)와 댓글 작성자 ID(comment.userId)가 같을 때만 삭제 버튼을 보여줍니다! */}
                                {myUserId === comment.userId && (
                                    <button
                                        onClick={() => handleDeleteComment(comment.commentId)}
                                        className="shrink-0 ml-4 text-sm text-red-500 transition hover:text-red-700 hover:underline"
                                    >
                                        삭제
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
            {/* 댓글 UI 영역 끝 */}
        </div>
    );
};

export default PostDetailPage;