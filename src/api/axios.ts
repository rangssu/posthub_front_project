// src/api/axios.ts
import axios from 'axios';

// 1. 기본 설정: 스프링부트 주소를 미리 적어둡니다.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // 변경된 부분!
});

// 2. 인터셉터: 백엔드로 요청을 보내기 직전에 가로채서 토큰을 몰래(?) 넣어줍니다.
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

export default api;