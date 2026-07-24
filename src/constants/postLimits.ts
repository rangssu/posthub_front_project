/**
 * 입력 길이 제한.
 *
 * 백엔드 검증(PostFieldLimits, CommentRequest)과 같은 값이어야 한다.
 * 프론트가 더 느슨하면 사용자가 다 쓰고 나서야 400을 받고,
 * 더 빡빡하면 서버가 허용하는 글을 쓸 수 없다.
 */

/** 게시글 제목 (백엔드 @Size(max = 255)) */
export const TITLE_MAX = 255;

/** 게시글 본문 (백엔드 @Size(max = 100_000)) */
export const CONTENT_MAX = 100_000;

/** 댓글 (백엔드 @Size(max = 1000)) */
export const COMMENT_MAX = 1000;
