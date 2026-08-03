export interface PostErrors {
    title?: string;
    content?: string;
}

/**
 * 글 작성·수정 폼의 입력 검증.
 *
 * 두 화면이 같은 규칙을 쓰므로 한곳에 둔다. 전에는 양쪽이 각자
 * '제목과 내용을 모두 입력해주세요.' 하나를 alert로 띄웠는데, 둘 중 어느 쪽이
 * 비었는지 알려주지 않아 사용자가 직접 찾아야 했다. 칸마다 나눠 담는다.
 *
 * 공백만 넣은 것은 채운 것으로 치지 않는다. 서버도 같은 기준으로 거절한다.
 */
export const validatePost = (title: string, content: string): PostErrors => {
    const errors: PostErrors = {};
    if (!title.trim()) errors.title = '제목을 입력해주세요.';
    if (!content.trim()) errors.content = '내용을 입력해주세요.';
    return errors;
};
