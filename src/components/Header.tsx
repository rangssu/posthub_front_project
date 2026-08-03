import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import SearchBox from './SearchBox';
import { Button } from './ui/Button';
import { ThemeToggle } from './ThemeToggle';
import { toast } from './ui/toastStore';

/**
 * 사이트 공통 헤더.
 *
 * 전에는 BoardPage 안에 직접 박혀 있어서 나머지 6개 페이지는 로고도
 * 로그인 상태도 없이 떴다.
 */
const Header = () => {
    const navigate = useNavigate();
    const isLoggedIn = Boolean(localStorage.getItem('accessToken'));

    const handleLogout = async () => {
        /*
         * 서버에도 알려야 로그아웃이 실제로 끝난다. 리프레시 토큰은 httpOnly
         * 쿠키라 프론트가 지울 수 없고, 서버가 계열을 폐기하지 않으면 그 쿠키로
         * 계속 새 액세스 토큰을 받아갈 수 있다.
         *
         * 실패해도 로컬 정리는 진행한다. 서버가 죽었다고 로그아웃이 막히면 안 된다.
         */
        try {
            await api.post('/auth/logout');
        } catch {
            console.warn('서버 로그아웃에 실패했습니다. 로컬 인증 정보만 정리합니다.');
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('role');
        toast.success('로그아웃했습니다.');
        navigate('/boards');
    };

    return (
        <header role="banner" className="border-b border-border">
            <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
                <Link
                    to="/boards"
                    className="text-lg font-semibold tracking-tight text-fg hover:text-accent"
                >
                    PostHub
                </Link>

                <div className="ml-auto flex items-center gap-2">
                    <div className="hidden sm:block">
                        <SearchBox />
                    </div>
                    <ThemeToggle />
                    {isLoggedIn ? (
                        <Button variant="secondary" size="sm" onClick={handleLogout}>
                            로그아웃
                        </Button>
                    ) : (
                        <Button size="sm" onClick={() => navigate('/login')}>
                            로그인
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
