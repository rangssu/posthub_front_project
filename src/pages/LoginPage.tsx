// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 이동을 위한 훅
import api from '../api/axios'; // 방금 만든 우체국(axios) 불러오기

const LoginPage = () => {
    // 사용자가 입력한 아이디와 비밀번호를 기억할 공간(state)
    const navigate = useNavigate(); // 👈 추가
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');

    // 로그인 버튼을 눌렀을 때 실행될 함수
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault(); // 버튼 누르면 새로고침 되는 기본 현상 방지

        try {
            // 백엔드로 로그인 요청 보내기 (작성하신 AuthController의 /api/auth/login 과 연결)
            const response = await api.post('/auth/login', {
                loginId: loginId,
                password: password,
            });

            // 성공하면 백엔드가 준 accessToken을 브라우저 금고(localStorage)에 저장
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('userId', response.data.userId);
            alert('로그인 성공!');

            // 나중에 메인 화면으로 이동하는 코드를 여기에 추가할 거예요.
            // 👇 [추가] 로그인 성공 시 메인 게시판 페이지로 이동합니다.
            navigate('/BoardPage');

        } catch (error) {
            alert('아이디 또는 비밀번호를 확인해주세요.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">PostHub 로그인</h2>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">아이디</label>
                        <input
                            type="text"
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                        로그인
                    </button>
                </form>
                {/* 👇 추가된 회원가입 이동 버튼 */}
                <div className="mt-4 text-center">
                    <button onClick={() => navigate('/signup')} className="text-sm text-green-600 hover:underline">
                        계정이 없으신가요? 회원가입하기
                    </button>
                </div>

            </div>
        </div>
    );
};

export default LoginPage;