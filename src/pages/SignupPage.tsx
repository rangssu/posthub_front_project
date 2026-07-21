// src/pages/SignupPage.tsx
import { useState, useEffect } from 'react'; // 1. useEffect를 꼭 같이 불러와야 합니다.
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';

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

    // 👇 [추가] 이메일 형식을 검사하는 함수 (공부용 주석)
    const validateEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    // 회원가입 버튼을 눌렀을 때 실행될 함수
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        // 👇 [추가] 프론트엔드 공백 및 길이 검증
        if (!loginId.trim() || !password.trim() || !name.trim() || !nickname.trim() || !email.trim()) {
            alert('모든 항목을 공백 없이 입력해주세요.');
            return;
        }
        if (loginId.length < 4 || loginId.length > 20) {
            alert('아이디는 4자 이상 20자 이하여야 합니다.');
            return;
        }
        if (password.length < 8 || password.length > 20) {
            alert('비밀번호는 8자 이상 20자 이하여야 합니다.');
            return;
        }

        // 👇 [추가] 이메일 형식 체크
        if (!validateEmail(email)) {
            alert('올바른 이메일 형식이 아닙니다.');
            return;
        }

        try {
            /** * [중요] 아이디/닉네임 중복 확인 로직
             * 백엔드에 중복 확인 API가 없다면 가입 시도 시 백엔드에서 에러를 던져줍니다.
             * 현재는 가입 요청(api.post) 시 에러가 나면 catch문에서 처리하게 됩니다.
             */

            // 백엔드의 UserController (POST /api/users) 로 데이터 전송
            await api.post('/users', {
                loginId: loginId,
                password: password,
                name: name,
                nickname: nickname,
                email: email,
            });

            alert('회원가입이 완료되었습니다! 로그인해주세요.');
            navigate('/login'); // 가입 성공 시 로그인 화면으로 자동 이동

        } catch (error) {
            console.error(error);
            // 백엔드가 어떤 항목이 중복인지 알려주므로 그대로 보여줍니다.
            alert(errorMessage(error, '회원가입에 실패했습니다. 입력하신 정보를 확인해주세요.'));
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">PostHub 회원가입</h2>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">아이디</label>
                        <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} required
                               className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">비밀번호</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                               className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">이름</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                               className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">닉네임</label>
                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} required
                               className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">이메일</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                               className="w-full px-3 py-2 mt-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <button type="submit" className="w-full py-2 mt-4 font-bold text-white bg-green-600 rounded hover:bg-green-700">
                        가입하기
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button onClick={() => navigate('/login')} className="text-sm text-blue-600 hover:underline">
                        이미 계정이 있으신가요? 로그인하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;