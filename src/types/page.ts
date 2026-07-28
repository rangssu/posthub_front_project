/**
 * Spring Boot 4의 Page 직렬화 형식.
 *
 * Boot 3까지는 totalPages/totalElements가 응답 루트에 있었지만
 * Boot 4는 page 객체 안으로 들어갔다. 루트에서 읽으면 undefined가 되고,
 * totalPages > 0 조건이 false가 되면서 페이징 버튼이 통째로 사라진다.
 */
export interface PageResponse<T> {
    content: T[];
    page?: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}
