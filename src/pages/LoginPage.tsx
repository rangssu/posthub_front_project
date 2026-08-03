// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 이동을 위한 훅
import api from '../api/axios'; // 방금 만든 우체국(axios) 불러오기
import Layout from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/toastStore';

interface LoginErrors {
    loginId?: string;
    password?: string;
}

/**
 * 입력 검증.
 *
 * 첫 실패에서 멈추지 않고 전부 모아 돌려준다. alert는 한 번에 하나만 알려줘서
 * 고치고 누르기를 반복해야 했다.
 */
const validate = (loginId: string, password: string): LoginErrors => {
    const errors: LoginErrors = {};

    if (!loginId.trim()) errors.loginId = '아이디를 입력해주세요.';
    else if (loginId.length < 4 || loginId.length > 20)
        errors.loginId = '아이디는 4자 이상 20자 이하여야 합니다.';

    if (!password.trim()) errors.password = '비밀번호를 입력해주세요.';
    else if (password.length < 8 || password.length > 20)
        errors.password = '비밀번호는 8자 이상 20자 이하여야 합니다.';

    return errors;
};

const LoginPage = () => {
    // 사용자가 입력한 아이디와 비밀번호를 기억할 공간(state)
    const navigate = useNavigate(); // 👈 추가
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<LoginErrors>({});

    // 로그인 버튼을 눌렀을 때 실행될 함수
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault(); // 버튼 누르면 새로고침 되는 기본 현상 방지

        // 👇 [추가] 프론트엔드 공백 및 길이 검증
        const nextErrors = validate(loginId, password);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        try {
            // 백엔드로 로그인 요청 보내기 (작성하신 AuthController의 /api/auth/login 과 연결)
            const response = await api.post('/auth/login', {
                loginId: loginId,
                password: password,
            });

            // 성공하면 백엔드가 준 accessToken을 브라우저 금고(localStorage)에 저장
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('userId', response.data.userId);
            localStorage.setItem('role', response.data.role); // 게시판 관리 버튼 노출 판단용

            // 성공 알림을 띄우지 않는다. 화면이 게시판으로 바뀌는 것이 곧 피드백이고,
            // 알림은 확인 클릭을 한 번 더 요구할 뿐이었다.
            // 👇 [수정됨] 로그인 성공 시 대문자가 제거된 /boards 페이지로 이동합니다.
            navigate('/boards');
        } catch {
            // 아이디가 틀렸는지 비밀번호가 틀렸는지는 알려주지 않는다. 계정 존재
            // 여부가 새 나가므로, 인라인이 아니라 토스트로 뭉뚱그린다.
            toast.error('아이디 또는 비밀번호를 확인해주세요.');
        }
    };

    return (
        <Layout width="narrow">
            <h1 className="mb-6 text-2xl font-bold text-center text-fg">PostHub 로그인</h1>

            {/*
             * aria-label은 헤더에도 '로그인' 버튼이 있어 이름만으로는 구분되지 않기 때문이다.
             *
             * noValidate로 브라우저 기본 제약 검증을 끈다. 기본 말풍선은 문구도 스타일도
             * 우리가 정할 수 없고, 무엇보다 제약에 걸리면 submit 이벤트 자체가 막혀
             * 우리 인라인 검증이 실행되지 않는다.
             */}
            <form onSubmit={handleLogin} aria-label="로그인" noValidate className="space-y-4">
                <Field label="아이디" htmlFor="loginId" error={errors.loginId}>
                    <Input
                        id="loginId"
                        type="text"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        invalid={Boolean(errors.loginId)}
                        aria-describedby={errors.loginId ? 'loginId-error' : undefined}
                    />
                </Field>

                <Field label="비밀번호" htmlFor="password" error={errors.password}>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        invalid={Boolean(errors.password)}
                        aria-describedby={errors.password ? 'password-error' : undefined}
                    />
                </Field>

                {/*
                 * required를 붙이지 않는다. 브라우저 기본 말풍선이 우리 인라인 오류와
                 * 겹쳐 뜨고, 그 말풍선은 스타일도 문구도 우리가 정할 수 없다.
                 */}
                <Button type="submit" className="w-full">
                    로그인
                </Button>
            </form>

            {/* 👇 추가된 회원가입 이동 버튼 */}
            <div className="mt-4 text-center">
                <Button variant="ghost" size="sm" onClick={() => navigate('/signup')}>
                    계정이 없으신가요? 회원가입하기
                </Button>
            </div>
        </Layout>
    );
};

export default LoginPage;
