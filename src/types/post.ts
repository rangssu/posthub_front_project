/**
 * 백엔드 PostListResponse 한 건. 게시판 목록과 검색 결과가 공유한다.
 *
 * 필드명이 백엔드와 정확히 일치해야 한다(userName 아님).
 * 탈퇴한 회원의 글은 nickname이 '탈퇴한 사용자'로 내려온다.
 * 본문(content)과 좋아요 수(likeCount)는 목록 응답에 없다.
 */
export interface PostSummary {
    id: number;
    title: string;
    viewCount: number;
    createdAt: string;
    userId: number;
    nickname: string;
    commentsSize: number;
}
