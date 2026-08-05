// src/pages/SignupPage.tsx
import { useState, useEffect } from 'react'; // 1. useEffect를 꼭 같이 불러와야 합니다.
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';
import Layout from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/toastStore';

interface SignupForm {
    loginId: string;
    password: string;
    name: string;
    nickname: string;
    email: string;
}

type SignupErrors = Partial<Record<keyof SignupForm, string>>;

// 👇 [추가] 이메일 형식을 검사하는 함수 (공부용 주석)
const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

/**
 * 입력 검증.
 *
 * 전에는 다섯 칸의 공백을 '모든 항목을 공백 없이 입력해주세요.' 하나로 뭉쳐
 * alert를 띄웠다. 어느 칸이 비었는지 알 수 없어 사용자가 직접 찾아야 했다.
 * 칸마다 나눠 담고 한 번에 전부 돌려준다.
 */
const validate = (form: SignupForm): SignupErrors => {
    const errors: SignupErrors = {};

    if (!form.loginId.trim()) errors.loginId = '아이디를 입력해주세요.';
    else if (form.loginId.length < 4 || form.loginId.length > 20)
        errors.loginId = '아이디는 4자 이상 20자 이하여야 합니다.';

    if (!form.password.trim()) errors.password = '비밀번호를 입력해주세요.';
    else if (form.password.length < 8 || form.password.length > 20)
        errors.password = '비밀번호는 8자 이상 20자 이하여야 합니다.';

    if (!form.name.trim()) errors.name = '이름을 입력해주세요.';
    if (!form.nickname.trim()) errors.nickname = '닉네임을 입력해주세요.';

    if (!form.email.trim()) errors.email = '이메일을 입력해주세요.';
    else if (!validateEmail(form.email)) errors.email = '올바른 이메일 형식이 아닙니다.';

    return errors;
};

const SignupPage = () => {
    const navigate = useNavigate();

    // 2. 여기에 추가하세요! (컴포넌트 시작 부분)
    useEffect(() => {
        if (localStorage.getItem('accessToken')) {
            // 가입 화면에서는 기존 로그인 정보를 모두 비웁니다.
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('role');
        }
    }, []); // []는 페이지가 처음 열릴 때 딱 한 번만 실행하라는 의미입니다.

    // 5가지 입력값을 관리할 state
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<SignupErrors>({});

    // 회원가입 버튼을 눌렀을 때 실행될 함수
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        // 👇 [추가] 프론트엔드 공백 및 길이 검증
        const form = { loginId, password, name, nickname, email };
        const nextErrors = validate(form);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        try {
            /** * [중요] 아이디/닉네임 중복 확인 로직
             * 백엔드에 중복 확인 API가 없다면 가입 시도 시 백엔드에서 에러를 던져줍니다.
             * 현재는 가입 요청(api.post) 시 에러가 나면 catch문에서 처리하게 됩니다.
             */

            // 백엔드의 UserController (POST /api/users) 로 데이터 전송
            await api.post('/users', form);

            toast.success('회원가입이 완료되었습니다. 로그인해주세요.');
            navigate('/login'); // 가입 성공 시 로그인 화면으로 자동 이동
        } catch (error) {
            console.error(error);
            // 백엔드가 어떤 항목이 중복인지 알려주므로 그대로 보여줍니다.
            // 중복은 서버만 알 수 있어 특정 칸에 붙일 수 없다. 그래서 이것만 토스트다.
            toast.error(errorMessage(error, '회원가입에 실패했습니다. 입력하신 정보를 확인해주세요.'));
        }
    };

    return (
        <Layout width="narrow">
            <h1 className="mb-6 text-2xl font-bold text-center text-fg">PostHub 회원가입</h1>

            {/*
             * noValidate로 브라우저 기본 제약 검증을 끈다. required를 빼는 것만으로는
             * 부족했다 - type="email"에 형식이 안 맞는 값이 들어 있으면 브라우저가
             * submit 이벤트 자체를 막아버려, 우리 검증은 실행조차 되지 않고 사용자는
             * 문구도 스타일도 우리가 정할 수 없는 기본 말풍선만 보게 된다.
             */}
            <form onSubmit={handleSignup} aria-label="회원가입" noValidate className="space-y-4">
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

                <Field label="이름" htmlFor="name" error={errors.name}>
                    <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                    />
                </Field>

                <Field label="닉네임" htmlFor="nickname" error={errors.nickname}>
                    <Input
                        id="nickname"
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        invalid={Boolean(errors.nickname)}
                        aria-describedby={errors.nickname ? 'nickname-error' : undefined}
                    />
                </Field>

                <Field label="이메일" htmlFor="email" error={errors.email}>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                    />
                </Field>

                <Button type="submit" className="w-full">
                    가입하기
                </Button>
            </form>

            <div className="mt-4 text-center">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                    이미 계정이 있으신가요? 로그인하기
                </Button>
            </div>
        </Layout>
    );
};

export default SignupPage;
