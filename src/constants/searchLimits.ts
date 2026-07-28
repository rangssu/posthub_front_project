/**
 * 검색어 길이 제한.
 *
 * 백엔드 SearchQuery와 같은 값이어야 한다. 하한 2글자는 MySQL ngram 파서의
 * 토큰 크기에서 나온다. 1글자는 인덱스에 토큰으로 존재하지 않아 항상 빈 결과다.
 */

/** 검색어 최소 길이 */
export const SEARCH_MIN = 2;

/** 검색어 최대 길이 */
export const SEARCH_MAX = 100;
