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
        // 에러가 발생했을 때, 백엔드에서 보낸 상태 코드(status)가 401(미인증) 또는 403(권한없음)인 경우
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.warn("토큰이 만료되었거나 권한이 없습니다. 로그아웃 처리합니다.");

            // 스토리지를 비워서 남아있는 찌꺼기를 깔끔하게 무효화시킵니다.
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userId');

            // 사용자에게 알림을 띄웁니다.
            alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');

            // 윈도우 객체를 이용해 강제로 로그인 페이지로 보냅니다.
            window.location.href = '/login';
        }

        // 그 외의 에러는 원래대로 컴포넌트의 catch 부분으로 넘깁니다.
        return Promise.reject(error);
    }
);

export default api;