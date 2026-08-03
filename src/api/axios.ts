// src/api/axios.ts
import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { refreshAccessToken } from './refreshClient';
import { toast } from '../components/ui/toastStore';

// 1. 기본 설정: 스프링부트 주소를 미리 적어둡니다.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // 변경된 부분!

    /*
     * 리프레시 토큰은 httpOnly 쿠키로만 오갑니다(JS로는 읽을 수 없습니다).
     * 이게 없으면 브라우저가 크로스 오리진 요청에 쿠키를 싣지도, 받은 쿠키를
     * 저장하지도 않아 토큰 갱신이 아예 불가능합니다.
     * 백엔드는 SecurityConfig에서 allowCredentials(true)로 이미 받아줍니다.
     */
    withCredentials: true,
});

// 2. 요청(Request) 인터셉터: 백엔드로 요청을 보내기 직전에 가로채서 토큰을 몰래(?) 넣어줍니다.
api.interceptors.request.use(
    (config) => {
        // 브라우저 저장소(localStorage)에서 토큰을 꺼내옵니다.
        const token = localStorage.getItem('accessToken');
        if (token) {
            // 토큰이 있으면 Authorization 헤더에 달아줍니다.
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 👇 [추가] 3. 응답(Response) 인터셉터: 백엔드에서 온 에러를 전역적으로 처리합니다.
api.interceptors.response.use(
    (response) => {
        // 정상적인 응답은 그대로 화면(컴포넌트)으로 보냅니다.
        return response;
    },
    async (error) => {
        /*
         * 401(미인증)과 403(권한 부족)은 반드시 구분해야 합니다.
         * 둘 다 로그아웃 처리하면 "남의 글을 수정하려 했다" 같은 정상적인 거부에서도
         * 멀쩡히 로그인된 사용자가 강제로 튕겨나갑니다.
         */
        const status = error.response?.status;
        const request = error.config as RetriableRequest | undefined;

        if (status === 401 && request && canRetry(request)) {
            /*
             * 액세스 토큰은 15분짜리라 만료가 일상입니다. 바로 로그아웃시키면
             * 15분마다 튕겨나가므로, 먼저 재발급을 시도하고 원래 요청을 이어붙입니다.
             * 재발급이 겹치지 않게 막는 일은 refreshAccessToken이 합니다.
             */
            request.__retried = true;
            try {
                const accessToken = await refreshAccessToken();
                // headers는 AxiosHeaders 인스턴스입니다. 통째로 갈아끼우면 메서드가 사라집니다.
                request.headers.set('Authorization', `Bearer ${accessToken}`);
                return api(request);
            } catch {
                // 재발급까지 실패했으면 진짜로 세션이 끝난 것입니다.
                logoutLocally();
            }
        }

        // 그 외의 에러(403 포함)는 원래대로 컴포넌트의 catch 부분으로 넘깁니다.
        return Promise.reject(error);
    }
);

/** 재시도 여부를 표시해 둔 요청 설정. 같은 요청을 두 번 재시도하면 무한 루프가 됩니다. */
type RetriableRequest = InternalAxiosRequestConfig & { __retried?: boolean };

/**
 * 이 401을 토큰 재발급으로 되살릴 수 있는지 판단합니다.
 *
 * 인증 엔드포인트를 제외하는 것이 핵심입니다. 재발급 요청 자체가 401을 받았을 때
 * 다시 재발급을 시도하면 자기 자신을 무한히 부릅니다. 로그인 실패의 401도
 * 정상적인 응답이지 만료가 아닙니다.
 */
const canRetry = (request: RetriableRequest): boolean => {
    if (request.__retried) return false;
    return !(request.url ?? '').startsWith('/auth/');
};

/**
 * 이동이 예약됐는지. 페이지가 여러 요청을 동시에 보내면 401도 여러 개 돌아오는데,
 * 이동을 지연시키는 동안에는 pathname이 아직 /login이 아니라 아래 가드를 다 통과한다.
 * alert는 블로킹이라 이 문제가 드러나지 않았지만 토스트는 그대로 쌓인다.
 */
let logoutScheduled = false;

/** 토스트를 읽을 시간(ms). 바로 이동하면 페이지가 새로 로드돼 문구가 보이지 않는다. */
const LOGOUT_REDIRECT_DELAY_MS = 1200;

/** 저장된 인증 정보를 버리고 로그인 화면으로 보냅니다. */
const logoutLocally = () => {
    console.warn('인증이 만료되었습니다. 로그아웃 처리합니다.');

    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');

    // 이미 로그인 화면이라면 다시 보내지 않습니다 (로그인 실패 시 무한 알림 방지)
    if (window.location.pathname === '/login' || logoutScheduled) return;
    logoutScheduled = true;

    /*
     * 여기는 React 트리 밖(axios 인터셉터)이라 훅을 부를 수 없다.
     * 토스트를 모듈 함수로 만든 이유가 이 한 줄이다.
     */
    toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
    setTimeout(() => {
        window.location.href = '/login';
    }, LOGOUT_REDIRECT_DELAY_MS);
};

/**
 * 백엔드 GlobalExceptionHandler가 내려주는 { code, message } 중 message를 꺼냅니다.
 * 형식이 다르거나 네트워크 오류면 fallback을 씁니다.
 */
export const errorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;
        if (typeof message === 'string' && message.trim()) return message;
    }
    return fallback;
};

export default api;