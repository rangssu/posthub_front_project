import { beforeEach, describe, expect, it, vi } from 'vitest';

// 리프레시는 기본 axios로 보낸다(우리 인스턴스를 쓰면 인터셉터가 자기 자신을 부른다).
// 그래서 목킹 대상도 axios 모듈 자체다.
vi.mock('axios', () => ({
    default: { post: vi.fn() },
}));

const axios = (await import('axios')).default as unknown as {
    post: ReturnType<typeof vi.fn>;
};

/**
 * refreshClient는 진행 중인 요청을 모듈 스코프에 들고 있다.
 * 테스트끼리 그 상태가 새면 "1회만 호출" 같은 단정이 앞 테스트에 오염되므로
 * 매번 모듈을 새로 불러온다.
 */
const loadFresh = async () => {
    vi.resetModules();
    return (await import('./refreshClient')).refreshAccessToken;
};

/** 수동으로 완료시킬 수 있는 응답. 여러 호출이 겹치는 상황을 만들려면 필요하다. */
const deferred = () => {
    let resolve!: (value: unknown) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

const okResponse = (accessToken: string) => ({
    data: { accessToken, userId: 42, role: 'USER' },
});

describe('refreshAccessToken', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    /*
     * 이 테스트가 이 파일에서 가장 중요하다.
     * 백엔드 RedisRefreshTokenStore.rotate는 재사용을 감지하면 계열 전체를 폐기한다.
     * 토큰이 만료된 순간 목록·상세·좋아요가 동시에 401을 받는데, 각자 리프레시를
     * 보내면 두 번째가 재사용으로 판정돼 로그인 세션이 통째로 날아간다.
     */
    it('동시에 여러 번 불러도 리프레시 요청은 한 번만 나간다', async () => {
        const refreshAccessToken = await loadFresh();
        const pending = deferred();
        axios.post.mockReturnValue(pending.promise);

        const calls = [refreshAccessToken(), refreshAccessToken(), refreshAccessToken()];
        pending.resolve(okResponse('new-token'));

        await expect(Promise.all(calls)).resolves.toEqual([
            'new-token',
            'new-token',
            'new-token',
        ]);
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('리프레시 엔드포인트로 쿠키를 실어 보낸다', async () => {
        const refreshAccessToken = await loadFresh();
        axios.post.mockResolvedValue(okResponse('new-token'));

        await refreshAccessToken();

        const [url, body, config] = axios.post.mock.calls[0];
        // 쿠키가 Path=/api/auth라 경로가 어긋나면 브라우저가 쿠키를 안 싣는다.
        expect(url).toMatch(/\/auth\/refresh$/);
        expect(body).toBeNull();
        expect(config).toMatchObject({ withCredentials: true });
    });

    it('성공하면 새 인증 정보를 저장한다', async () => {
        const refreshAccessToken = await loadFresh();
        axios.post.mockResolvedValue(okResponse('new-token'));

        await expect(refreshAccessToken()).resolves.toBe('new-token');

        expect(localStorage.getItem('accessToken')).toBe('new-token');
        expect(localStorage.getItem('userId')).toBe('42');
        expect(localStorage.getItem('role')).toBe('USER');
    });

    it('앞선 리프레시가 끝난 뒤의 호출은 새로 요청한다', async () => {
        const refreshAccessToken = await loadFresh();
        axios.post.mockResolvedValue(okResponse('first'));
        await refreshAccessToken();

        axios.post.mockResolvedValue(okResponse('second'));
        await expect(refreshAccessToken()).resolves.toBe('second');

        // 진행 중 표시가 해제되지 않으면 두 번째 호출이 낡은 토큰을 그대로 돌려준다.
        expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('실패해도 진행 중 표시가 풀려 다시 시도할 수 있다', async () => {
        const refreshAccessToken = await loadFresh();
        axios.post.mockRejectedValue(new Error('401'));

        await expect(refreshAccessToken()).rejects.toThrow();

        axios.post.mockResolvedValue(okResponse('recovered'));
        await expect(refreshAccessToken()).resolves.toBe('recovered');
        expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('실패하면 인증 정보를 쓰지 않는다', async () => {
        const refreshAccessToken = await loadFresh();
        localStorage.setItem('accessToken', 'stale');
        axios.post.mockRejectedValue(new Error('401'));

        await expect(refreshAccessToken()).rejects.toThrow();

        // 정리는 인터셉터의 책임이다. 여기서 지우면 실패 처리가 두 곳으로 갈린다.
        expect(localStorage.getItem('accessToken')).toBe('stale');
    });
});
