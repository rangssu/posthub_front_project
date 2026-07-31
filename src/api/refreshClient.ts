import axios from 'axios';

/**
 * 액세스 토큰 재발급.
 *
 * 백엔드 RedisRefreshTokenStore.rotate는 리프레시 토큰을 회전시키면서 재사용을 감지하는데,
 * 감지되면 그 계열 전체를 폐기한다. 즉 리프레시를 동시에 두 번 보내면 두 번째가 재사용으로
 * 판정돼 로그인 세션이 통째로 날아간다.
 *
 * 토큰이 만료되는 순간 화면의 여러 요청이 한꺼번에 401을 받으므로 이건 실제로 걸리는 문제다.
 * 그래서 진행 중인 요청을 하나만 두고, 나중에 온 호출은 같은 약속을 함께 기다린다.
 */
let inFlight: Promise<string> | null = null;

interface RefreshResponse {
    accessToken: string;
    userId: number;
    role: string;
}

const requestRefresh = async (): Promise<string> => {
    /*
     * 우리 axios 인스턴스가 아니라 기본 axios를 쓴다.
     * 인스턴스를 쓰면 이 응답의 401이 다시 인터셉터를 타고 자기 자신을 부른다.
     * 그래서 baseURL과 withCredentials를 여기서 직접 지정한다.
     */
    const { data } = await axios.post<RefreshResponse>(
        `${import.meta.env.VITE_API_URL}/auth/refresh`,
        null,
        { withCredentials: true }
    );

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('userId', String(data.userId));
    localStorage.setItem('role', data.role);

    return data.accessToken;
};

/**
 * 진행 중인 재발급이 있으면 그것을 함께 기다리고, 없으면 새로 시작한다.
 *
 * 실패 시 인증 정보를 지우지 않는다. 로그아웃 처리는 인터셉터 한 곳에서만 한다
 * (두 곳으로 갈리면 어디서 튕겨나갔는지 추적할 수 없다).
 */
export const refreshAccessToken = (): Promise<string> => {
    if (!inFlight) {
        inFlight = requestRefresh().finally(() => {
            inFlight = null;
        });
    }
    return inFlight;
};
