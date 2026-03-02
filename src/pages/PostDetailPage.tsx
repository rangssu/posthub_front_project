// src/pages/PostDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

// 백엔드의 PostResponse(단건 조회) 데이터 구조에 맞춘 타입 정의입니다.
interface PostDetail {
    id: number;
    title: string;
    content: string;
    viewCount: number;
    createdAt: string;
}

// 백엔드의 CommentResponse 데이터 구조에 맞춘 타입 정의입니다.
interface CommentData {
    id: number;
    content: string;
}

const PostDetailPage = () => {
    // URL 주소창에 있는 파라미터(id 값)를 가져옵니다. (예: /posts/5 -> postId는 "5")
    const { postId } = useParams();
    const navigate = useNavigate();

    // 게시글 데이터를 담아둘 상태(state)입니다. 처음에는 아직 데이터를 안 받아왔으니 null입니다.
    const [post, setPost] = useState<PostDetail | null>(null);

    // 댓글 목록과 사용자가 입력하는 새 댓글을 관리할 상태입니다.
    const [comments, setComments] = useState<CommentData[]>([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        const fetchPost = async () => {
            try {
                /**
                 * [공부 포인트] 백엔드 단건 조회 API 호출
                 * 백엔드의 PostController에 있는 @GetMapping("/posts/{postId}") 에 요청을 보냅니다.
                 */
                const response = await api.get(`/posts/${postId}`);
                setPost(response.data);
            } catch (error) {
                alert('게시글을 불러올 수 없습니다.');
                // 에러가 발생하거나 이미 삭제된 게시글이면 이전 목록(게시판)으로 돌려보냅니다.
                navigate('/BoardPage');
            }
        };

        // 게시글에 달린 댓글 목록을 불러오는 함수입니다.
        const fetchComments = async () => {
            try {
                // 백엔드 CommentController의 @GetMapping("/posts/{postId}/comments") 호출
                const response = await api.get(`/posts/${postId}/comments`);
                setComments(response.data);
            } catch (error) {
                console.error('댓글 로딩 실패', error);
            }
        };

        // 페이지가 처음 열릴 때 위에서 정의한 함수를 실행합니다.
        fetchPost();
        fetchComments(); // 글을 불러올 때 댓글도 함께 불러옵니다.
    }, [postId, navigate]);

    // 👇 [추가] 게시글 삭제 함수
    const handleDeletePost = async () => {
        if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;

        try {
            // 백엔드 PostController의 @DeleteMapping("/posts/{postId}") 호출
            await api.delete(`/posts/${postId}`);
            alert('게시글이 삭제되었습니다.');
            navigate('/BoardPage'); // 삭제 후 메인 게시판으로 이동
        } catch (error) {
            console.error('게시글 삭제 실패:', error);
            alert('게시글 삭제에 실패했습니다. 권한이 없는 것일 수 있습니다.');
        }
    };

    // 새 댓글을 서버에 등록하는 함수입니다.
    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // 폼 제출 시 새로고침 방지

        if (!newComment.trim()) {
            alert('댓글 내용을 입력해주세요.');
            return;
        }

        try {
            /**
             * [공부 포인트] 백엔드 댓글 생성 API 호출
             * CommentController의 @PostMapping("/posts/{postId}/comments") 로 요청을 보냅니다.
             */
            await api.post(`/posts/${postId}/comments`, {
                content: newComment
            });

            alert('댓글이 등록되었습니다.');
            setNewComment(''); // 입력창 비우기

            // 등록이 완료되면 댓글 목록을 서버에서 다시 불러와 화면을 갱신합니다.
            const response = await api.get(`/posts/${postId}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error('댓글 작성 실패:', error);
            alert('댓글 작성에 실패했습니다.');
        }
    };

    // 댓글 삭제 함수입니다.
    const handleDeleteComment = async (commentId: number) => {
        if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

        try {
            // 백엔드 CommentController의 @DeleteMapping("/comments/{commentsId}") 호출
            await api.delete(`/comments/${commentId}`);
            alert('댓글이 삭제되었습니다.');

            // 삭제된 댓글을 프론트엔드 상태(화면)에서도 즉시 지워줍니다.
            setComments(comments.filter(c => c.id !== commentId));
        } catch (error) {
            console.error('댓글 삭제 실패:', error);
            alert('댓글 삭제에 실패했습니다.');
        }
    };

    // 데이터를 서버에서 아직 다 받아오지 못했을 때 화면에 보여줄 로딩 표시입니다.
    if (!post) {
        return <div className="p-8 text-center text-gray-500">내용을 불러오는 중입니다...</div>;
    }

    return (
        <div className="max-w-4xl px-4 py-8 mx-auto">
            {/* 상단 버튼 영역 (뒤로가기, 수정, 삭제) */}
            <div className="flex items-center justify-between mb-4">
                <button
                    // navigate(-1)은 브라우저의 '뒤로 가기' 화살표와 똑같은 기능(이전 페이지로 이동)을 합니다.
                    onClick={() => navigate(-1)}
                    className="text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                >
                    &larr; 목록으로 돌아가기
                </button>

                {/* 👇 [추가] 게시글 수정 및 삭제 버튼 */}
                <div className="space-x-2">
                    <button
                        // 수정 페이지로 이동하며 현재 게시글 정보를 가지고 갑니다.
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
            </div>

            {/* 게시글 상세 내용을 보여주는 하얀색 박스 영역 */}
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

                {/* 댓글 작성 폼 */}
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
                            <div key={comment.id} className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded">
                                <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                                <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="shrink-0 ml-4 text-sm text-red-500 transition hover:text-red-700 hover:underline"
                                >
                                    삭제
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostDetailPage;