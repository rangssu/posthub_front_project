// src/pages/PostEditPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import { CONTENT_MAX, TITLE_MAX } from '../constants/postLimits';
import Layout from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { toast } from '../components/ui/toastStore';
import { validatePost } from './postFormValidation';
import type { PostErrors } from './postFormValidation';

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
    const [errors, setErrors] = useState<PostErrors>({});

    // 만약 새로고침 등으로 기존 데이터가 날아갔다면 다시 서버에서 불러옵니다.
    useEffect(() => {
        if (!existingPost) {
            const fetchPost = async () => {
                try {
                    const response = await api.get(`/posts/${postId}`);
                    setTitle(response.data.title);
                    setContent(response.data.content);
                } catch (error) {
                    toast.error(errorMessage(error, '데이터를 불러올 수 없습니다.'));
                    navigate(-1);
                }
            };
            fetchPost();
        }
    }, [postId, existingPost, navigate]);

    // 폼이 제출될 때(수정 완료 버튼 클릭 시) 실행되는 함수입니다.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const nextErrors = validatePost(title, content);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        try {
            /**
             * [공부 포인트] 백엔드 글 수정 API 호출
             * 수정해주신 백엔드 컨트롤러에 맞춰 @PutMapping("/posts/{postId}") 로 요청을 보냅니다.
             */
            await api.put(`/posts/${postId}`, {
                title: title,
                content: content
            });

            toast.success('게시글을 수정했습니다.');
            navigate(`/posts/${postId}`); // 수정이 끝나면 다시 상세 페이지로 돌아갑니다.
        } catch (error) {
            console.error('글 수정 에러:', error);
            toast.error(errorMessage(error, '글 수정에 실패했습니다.'));
        }
    };

    return (
        <Layout>
            <h1 className="mb-6 text-2xl font-bold text-fg">게시글 수정하기</h1>

            {/* noValidate는 LoginPage 주석 참고. */}
            <form
                onSubmit={handleSubmit}
                aria-label="게시글 수정"
                noValidate
                className="p-6 border border-border rounded-lg bg-bg space-y-4"
            >
                <Field label="제목" htmlFor="title" error={errors.title}>
                    <Input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={TITLE_MAX}
                        invalid={Boolean(errors.title)}
                        aria-describedby={errors.title ? 'title-error' : undefined}
                    />
                </Field>

                <Field label="내용" htmlFor="content" error={errors.content}>
                    <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={CONTENT_MAX}
                        rows={10}
                        invalid={Boolean(errors.content)}
                        aria-describedby={errors.content ? 'content-error' : undefined}
                    />
                </Field>

                <div className="flex items-center justify-end gap-2">
                    <Button variant="secondary" onClick={() => navigate(-1)}>
                        취소
                    </Button>
                    <Button type="submit">수정 완료</Button>
                </div>
            </form>
        </Layout>
    );
};

export default PostEditPage;
