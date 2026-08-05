// src/pages/PostWritePage.tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const PostWritePage = () => {
    // URL에서 어떤 게시판에 글을 쓸지 번호를 가져옵니다. (예: /boards/1/write 이면 boardId는 "1")
    const { boardId } = useParams();
    const navigate = useNavigate();

    // 사용자가 입력할 제목과 내용을 담을 상태(state)입니다.
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [errors, setErrors] = useState<PostErrors>({});

    // 폼이 제출될 때(작성 완료 버튼 클릭 시) 실행되는 함수입니다.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // 폼 제출 시 새로고침 방지

        // 빈 칸 검사 (간단한 유효성 검사)
        const nextErrors = validatePost(title, content);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        try {
            /**
             * [공부 포인트] 백엔드 글 작성 API 호출
             * 백엔드 PostController의 @PostMapping("/board/{boardId}/posts") 로 요청을 보냅니다.
             * 로그인할 때 발급받아 axios 인터셉터에 설정된 JWT 토큰이 자동으로 같이 날아갑니다.
             */
            const response = await api.post(`/board/${boardId}/posts`, {
                title: title,
                content: content
            });

            toast.success('게시글을 등록했습니다.');

            // 👇 [수정됨] 글 작성이 끝나면 방금 작성한 글의 상세 페이지(detail)로 넘어갑니다.
            // 백엔드에서 리턴해준 게시글의 ID (response.data)를 이용합니다.
            const newPostId = response.data;
            navigate(`/posts/${newPostId}`);
        } catch (error) {
            console.error('글 작성 에러:', error);
            toast.error(errorMessage(error, '글 작성에 실패했습니다.'));
        }
    };

    return (
        <Layout>
            <h1 className="mb-6 text-2xl font-bold text-fg">새 글 작성하기</h1>

            {/* 글쓰기 폼 영역. noValidate는 LoginPage 주석 참고. */}
            <form
                onSubmit={handleSubmit}
                aria-label="새 글 작성"
                noValidate
                className="p-6 border border-border rounded-lg bg-bg space-y-4"
            >
                <Field label="제목" htmlFor="title" error={errors.title}>
                    <Input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="제목을 입력하세요"
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
                        placeholder="내용을 입력하세요"
                        maxLength={CONTENT_MAX}
                        rows={10} // 높이를 넉넉하게 설정
                        invalid={Boolean(errors.content)}
                        aria-describedby={errors.content ? 'content-error' : undefined}
                    />
                </Field>

                {/* 하단 버튼 영역 */}
                <div className="flex items-center justify-end gap-2">
                    <Button variant="secondary" onClick={() => navigate(-1)}>
                        취소
                    </Button>
                    <Button type="submit">작성 완료</Button>
                </div>
            </form>
        </Layout>
    );
};

export default PostWritePage;
