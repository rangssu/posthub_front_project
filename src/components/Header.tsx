import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
    const [searchParams] = useSearchParams();
    const isLoggedIn = Boolean(localStorage.getItem('accessToken'));

    /*
     * 검색 결과 화면에서 검색창을 현재 검색어로 채운다. 전에는 SearchPage가 자기
     * 검색창을 따로 들고 있었는데, 헤더에도 하나 생기면서 한 화면에 둘이 됐다.
     * key를 검색어로 두면 뒤로가기로 URL이 되돌아갈 때 입력창도 함께 되돌아간다.
     */
    const query = searchParams.get('q') ?? '';

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
            <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 px-4 py-3">
                <Link
                    to="/boards"
                    className="text-lg font-semibold tracking-tight text-fg hover:text-accent"
                >
                    PostHub
                </Link>

                {/*
                 * sm 미만에서는 basis-full로 다음 줄로 밀려 검색창이 항상 보인다.
                 * sm 이상에서는 order-none으로 로고 바로 다음 자리로 돌아가고,
                 * ml-auto가 검색창과 그 뒤(테마·로그인) 그룹을 오른쪽으로 민다.
                 * SearchBox를 두 번 마운트하면 입력 상태가 갈리므로 여기 한 곳에만 둔다.
                 */}
                <div className="order-last basis-full sm:order-none sm:ml-auto sm:basis-auto">
                    <SearchBox key={query} initialQuery={query} />
                </div>

                <div className="ml-auto flex items-center gap-2 sm:ml-0">
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
