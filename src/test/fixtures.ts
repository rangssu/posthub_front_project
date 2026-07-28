import type { PostSummary } from '../types/post';

/** 백엔드 목록 응답 형태의 더미 글. 목록·검색 테스트가 함께 쓴다. */
export const makePosts = (count: number, startId: number): PostSummary[] =>
    Array.from({ length: count }, (_, i) => ({
        id: startId + i,
        title: `게시글 ${startId + i}`,
        viewCount: 0,
        createdAt: '2026-07-24T10:00:00',
        userId: 1,
        nickname: '작성자',
        commentsSize: 0,
    }));

/** 실제 백엔드(Spring Boot 4)가 내려주는 목록 응답 형식 */
export const bootPage = (posts: PostSummary[], totalElements: number, totalPages: number) => ({
    data: {
        content: posts,
        page: { size: 10, number: 0, totalElements, totalPages },
    },
});
