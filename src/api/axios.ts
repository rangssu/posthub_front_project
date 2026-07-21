// src/api/axios.ts
import axios from 'axios';

// 1. 기본 설정: 스프링부트 주소를 미리 적어둡니다.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // 변경된 부분!
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
    (error) => {
        /*
         * 401(미인증)과 403(권한 부족)은 반드시 구분해야 합니다.
         * 둘 다 로그아웃 처리하면 "남의 글을 수정하려 했다" 같은 정상적인 거부에서도
         * 멀쩡히 로그인된 사용자가 강제로 튕겨나갑니다.
         */
        const status = error.response?.status;

        if (status === 401) {
            console.warn('인증이 만료되었습니다. 로그아웃 처리합니다.');

            localStorage.removeItem('accessToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('role');

            // 이미 로그인 화면이라면 다시 보내지 않습니다 (로그인 실패 시 무한 알림 방지)
            if (window.location.pathname !== '/login') {
                alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
                window.location.href = '/login';
            }
        }

        // 그 외의 에러(403 포함)는 원래대로 컴포넌트의 catch 부분으로 넘깁니다.
        return Promise.reject(error);
    }
);

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