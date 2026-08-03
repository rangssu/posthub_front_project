// src/pages/PostDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { COMMENT_MAX } from '../constants/postLimits';
import LikeButton from '../components/LikeButton';
import Layout from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Field } from '../components/ui/Field';
import { Textarea } from '../components/ui/Textarea';
import { toast } from '../components/ui/toastStore';

// 백엔드의 PostResponse 데이터 구조에 맞춘 타입 정의
interface PostDetail {
    id: number;
    title: string;
    content: string;
    viewCount: number;
    createdAt: string;
    boardId: number;
    userId: number; // 👇 [추가] 글 작성자 ID
    /** 좋아요 수. 백엔드 PostResponse가 함께 내려준다. */
    likeCount: number;
    /** 내가 눌렀는지. 비로그인이면 항상 false로 내려온다. */
    likedByMe: boolean;
}

// 백엔드의 CommentResponse 데이터 구조에 맞춘 타입 정의
interface CommentData {
    commentId: number;
    userId: number; // 👇 댓글 작성자 ID
    content: string;
    createAt: string;
    nickname: string; // 👇 [추가] 댓글 작성자 닉네임
    /** 좋아요 수. 백엔드 CommentResponse가 함께 내려준다. */
    likeCount: number;
    /** 내가 눌렀는지. 비로그인이면 항상 false로 내려온다. */
    likedByMe: boolean;
}

/**
 * 삭제 확인 대상.
 *
 * window.confirm은 동기라 "확인 → 삭제"가 한 줄로 이어졌지만 다이얼로그는 비동기다.
 * 무엇을 지우려는 것인지를 확인 클릭 시점까지 들고 가야 해서, 댓글은 어느 댓글인지
 * id까지 여기 담는다.
 */
type DeleteTarget =
    | { kind: 'none' }
    | { kind: 'post' }
    | { kind: 'comment'; commentId: number };

const PostDetailPage = () => {
    const { postId } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState<PostDetail | null>(null);
    const [comments, setComments] = useState<CommentData[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentError, setCommentError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>({ kind: 'none' });

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
                toast.error(errorMessage(error, '게시글을 불러올 수 없습니다.'));
                // 👇 [수정됨] 대문자 제거된 /boards 로 이동
                navigate('/boards');
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

    const closeDelete = () => setDeleteTarget({ kind: 'none' });

    const submitDelete = async () => {
        if (deleteTarget.kind === 'post') {
            try {
                await api.delete(`/posts/${postId}`);
                toast.success('게시글을 삭제했습니다.');
                closeDelete();
                // 👇 [수정됨] 대문자 제거된 /boards 로 이동
                navigate('/boards');
            } catch (error) {
                console.error('게시글 삭제 실패:', error);
                toast.error(errorMessage(error, '게시글 삭제에 실패했습니다.'));
            }
            return;
        }

        if (deleteTarget.kind === 'comment') {
            const { commentId } = deleteTarget;
            try {
                await api.delete(`/comments/${commentId}`);
                toast.success('댓글을 삭제했습니다.');
                closeDelete();
                // 목록 전체를 다시 받지 않고 지운 것만 걷어낸다.
                setComments((previous) => previous.filter((c) => c.commentId !== commentId));
            } catch (error) {
                console.error('댓글 삭제 실패:', error);
                toast.error(errorMessage(error, '댓글 삭제에 실패했습니다.'));
            }
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) {
            // 검증 실패만은 토스트가 아니라 입력 아래로 보낸다. 어느 칸이 비었는지
            // 알려줘야 쓸모가 있고, 화면 구석의 토스트는 그걸 못 한다.
            setCommentError('댓글 내용을 입력해주세요.');
            return;
        }
        setCommentError('');

        try {
            await api.post(`/posts/${postId}/comments`, {
                content: newComment
            });
            toast.success('댓글을 등록했습니다.');
            setNewComment('');

            const response = await api.get(`/posts/${postId}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error('댓글 작성 실패:', error);
            toast.error(errorMessage(error, '댓글 작성에 실패했습니다. 로그인 상태를 확인하세요.'));
        }
    };

    if (!post) {
        return (
            <Layout>
                <p className="py-8 text-center text-fg-muted">내용을 불러오는 중입니다...</p>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* 상단 버튼 영역 */}
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/boards')}>
                    &larr; 목록으로 돌아가기
                </Button>

                {/* 👇 [핵심 변경점] 내 ID(myUserId)와 이 글의 작성자 ID(post.userId)가 같을 때만 버튼을 보여줍니다! */}
                {myUserId === post.userId && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/posts/${postId}/edit`, { state: { post } })}
                        >
                            수정
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteTarget({ kind: 'post' })}
                        >
                            삭제
                        </Button>
                    </div>
                )}
            </div>

            {/* 게시글 상세 박스 영역 */}
            <article className="p-8 mb-8 border border-border rounded-lg bg-bg">
                <h1 className="pb-4 mb-4 text-3xl font-bold text-fg border-b border-divider">
                    {post.title}
                </h1>
                <div className="flex justify-between mb-8 text-sm text-fg-muted">
                    <span>조회수: {post.viewCount}</span>
                    <span>작성일: {new Date(post.createdAt).toLocaleString()}</span>
                </div>
                <div className="leading-relaxed text-fg whitespace-pre-wrap">
                    {post.content}
                </div>
                <div className="pt-6 mt-6 border-t border-divider">
                    <LikeButton
                        target="posts"
                        id={post.id}
                        initial={{ liked: post.likedByMe, count: post.likeCount }}
                    />
                </div>
            </article>

            {/* 댓글 UI 영역 시작 */}
            <section className="p-6 border border-border rounded-lg bg-surface">
                <h2 className="mb-4 text-lg font-bold text-fg">댓글</h2>

                {/* 댓글 작성 폼 (로그인한 사람만 보이게 하려면 {myUserId && (...)} 로 감싸도 좋습니다) */}
                <form onSubmit={handleCommentSubmit} className="mb-6">
                    <Field label="댓글" htmlFor="comment" error={commentError || undefined}>
                        <Textarea
                            id="comment"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="댓글을 남겨보세요."
                            maxLength={COMMENT_MAX}
                            rows={3}
                            invalid={Boolean(commentError)}
                            aria-describedby={commentError ? 'comment-error' : undefined}
                        />
                    </Field>
                    <div className="flex items-center justify-end gap-3 mt-2">
                        <span className="text-xs text-fg-subtle">
                            {newComment.length} / {COMMENT_MAX}
                        </span>
                        <Button type="submit" size="sm">댓글 등록</Button>
                    </div>
                </form>

                {/* 댓글 목록 출력 영역 */}
                <div className="space-y-4">
                    {comments.length === 0 ? (
                        <p className="py-4 text-center text-fg-muted">작성된 댓글이 없습니다.</p>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.commentId} className="flex items-start justify-between p-4 border border-border rounded bg-bg">
                                <div className="flex flex-col">
                                    {/* 👇 [추가] 댓글 작성자의 닉네임을 보여줍니다. */}
                                    <span className="mb-1 text-sm font-bold text-fg">
                                        {comment.nickname}
                                    </span>
                                    <p className="text-fg whitespace-pre-wrap">{comment.content}</p>
                                    <span className="mt-2 text-xs text-fg-subtle">
                                        {comment.createAt ? new Date(comment.createAt).toLocaleString() : ''}
                                    </span>
                                    <div className="mt-2">
                                        <LikeButton
                                            target="comments"
                                            id={comment.commentId}
                                            initial={{ liked: comment.likedByMe, count: comment.likeCount }}
                                            size="sm"
                                        />
                                    </div>
                                </div>

                                {/* 👇 [핵심 변경점] 내 ID(myUserId)와 댓글 작성자 ID(comment.userId)가 같을 때만 삭제 버튼을 보여줍니다! */}
                                {myUserId === comment.userId && (
                                    <Button
                                        /*
                                         * ghost에 text-danger를 덧붙이면 variant의 text-fg-muted와 같은
                                         * 속성을 다투는데, 승자는 클래스를 쓴 순서가 아니라 tailwind.config.js의
                                         * 색 키 순서로 정해진다. 설정만 바꿔도 조용히 회색이 되므로 덮어쓰지 않고
                                         * 변형을 그대로 쓴다.
                                         */
                                        variant="danger"
                                        size="sm"
                                        onClick={() =>
                                            setDeleteTarget({ kind: 'comment', commentId: comment.commentId })
                                        }
                                        // 게시글 삭제 버튼과 이름이 겹치면 스크린 리더에서 어느 쪽인지 알 수 없다.
                                        aria-label="댓글 삭제"
                                        className="shrink-0 ml-4"
                                    >
                                        삭제
                                    </Button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </section>
            {/* 댓글 UI 영역 끝 */}

            {/* 게시글과 댓글이 다이얼로그 하나를 나눠 쓴다. 대상은 deleteTarget이 들고 있다. */}
            <Dialog
                open={deleteTarget.kind !== 'none'}
                title={deleteTarget.kind === 'comment' ? '댓글을 삭제할까요?' : '게시글을 삭제할까요?'}
                description="삭제하면 되돌릴 수 없습니다."
                onClose={closeDelete}
                footer={
                    <>
                        <Button variant="secondary" onClick={closeDelete}>취소</Button>
                        <Button variant="danger" onClick={submitDelete}>삭제</Button>
                    </>
                }
            />
        </Layout>
    );
};

export default PostDetailPage;
