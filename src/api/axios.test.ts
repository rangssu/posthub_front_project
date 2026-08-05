import { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToastItem } from '../components/ui/toastStore';

/**
 * 세션이 끝났을 때 사용자가 이유를 듣는지 확인한다.
 *
 * 인터셉터는 React 트리 밖이라 훅을 부를 수 없다. 토스트를 모듈 함수로 만든
 * 이유가 이 경로 하나이고, 그래서 여기가 끊기면 사용자는 아무 설명 없이
 * 로그인 화면으로 튕긴다. 조용히 깨지는 종류라 테스트로 못박는다.
 */
vi.mock('./refreshClient', () => ({
    // 재발급까지 실패해야 진짜 로그아웃 경로로 들어간다.
    refreshAccessToken: vi.fn().mockRejectedValue(new Error('refresh failed')),
}));

const unauthorized = (config: InternalAxiosRequestConfig) =>
    new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        data: {},
        headers: new AxiosHeaders(),
        config,
    });

/**
 * 401을 실제로 인터셉터에 태울 준비를 한다.
 *
 * axios와 토스트 스토어를 **같은 모듈 그래프에서** 가져오는 것이 중요하다.
 * resetModules 뒤에 새로 import한 axios는 toastStore도 새 복사본을 쓰므로,
 * 파일 맨 위에서 정적으로 import한 스토어를 구독하면 아무 알림도 보이지 않는다.
 */
const setup = async () => {
    const { default: api } = await import('./axios');
    const store = await import('../components/ui/toastStore');

    const seen: ToastItem[][] = [];
    const unsubscribe = store.subscribe((toasts) => seen.push(toasts));

    // 서버 없이 응답을 흉내내려면 어댑터를 갈아끼운다.
    api.defaults.adapter = async (config) => {
        throw unauthorized(config as InternalAxiosRequestConfig);
    };

    return { api, seen, unsubscribe };
};

describe('axios 인터셉터의 세션 만료 처리', () => {
    beforeEach(() => {
        vi.resetModules(); // logoutLocally의 중복 이동 방지 플래그가 모듈 전역이다.
        localStorage.clear();
        vi.useFakeTimers(); // 이동 예약을 실행시키지 않는다. jsdom은 페이지 이동을 못 한다.
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('재발급까지 실패하면 이유를 토스트로 알리고 인증 정보를 지운다', async () => {
        localStorage.setItem('accessToken', 'expired');
        localStorage.setItem('userId', '1');
        localStorage.setItem('role', 'USER');

        const { api, seen, unsubscribe } = await setup();

        await expect(api.get('/posts/1')).rejects.toThrow();

        expect(seen.at(-1)).toEqual([
            expect.objectContaining({
                kind: 'error',
                message: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
            }),
        ]);
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('userId')).toBeNull();
        expect(localStorage.getItem('role')).toBeNull();

        unsubscribe();
    });

    it('401이 여러 번 와도 토스트는 한 번만 뜬다', async () => {
        localStorage.setItem('accessToken', 'expired');

        const { api, seen, unsubscribe } = await setup();

        /*
         * 한 화면이 여러 요청을 동시에 보내면 401도 여러 개 돌아온다. 이동을 지연시키는
         * 동안에는 pathname이 아직 /login이 아니라 가드를 다 통과한다. alert는 블로킹이라
         * 이 문제가 드러나지 않았지만 토스트는 그대로 쌓인다.
         */
        await Promise.allSettled([api.get('/posts/1'), api.get('/posts/2'), api.get('/posts/3')]);

        expect(seen.at(-1)).toHaveLength(1);

        unsubscribe();
    });
});
