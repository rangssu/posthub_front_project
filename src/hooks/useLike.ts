import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/axios';

/** 좋아요를 누를 대상. 그대로 URL 경로가 된다. */
export type LikeTarget = 'posts' | 'comments';

/** 백엔드 LikeResponse. 좋아요/취소 응답이 공유한다. */
interface LikeApiResponse {
    liked: boolean;
    likeCount: number;
}

export interface LikeState {
    liked: boolean;
    count: number;
}

/**
 * 게시글·댓글 좋아요의 단일 진입점.
 *
 * 서버 응답을 그대로 상태로 삼는다(낙관적 업데이트 없음). 백엔드의 좋아요는
 * 멱등이라 이미 눌린 상태에서 POST해도 카운트가 오르지 않는데, 미리 숫자를
 * 올려두면 서버와 어긋난다. 응답을 기다렸다 받아쓰면 롤백 로직이 필요 없다.
 */
export const useLike = (target: LikeTarget, id: number, initial: LikeState) => {
    const navigate = useNavigate();
    const [liked, setLiked] = useState(initial.liked);
    const [count, setCount] = useState(initial.count);
    const [pending, setPending] = useState(false);

    // 부모가 목록을 다시 불러오면 서버 값으로 맞춘다.
    // 댓글 등록 후 재조회할 때 key가 유지되므로, 초기값만 쓰면 숫자가 옛 값에 멈춘다.
    useEffect(() => {
        setLiked(initial.liked);
        setCount(initial.count);
    }, [initial.liked, initial.count]);

    const toggle = async () => {
        // 비로그인은 API를 부르지 않는다. 401이 나가면 axios 인터셉터가
        // 한 번도 로그인한 적 없는 사람에게 '세션이 만료되었습니다'를 띄운다.
        if (!localStorage.getItem('accessToken')) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        // 연타로 같은 요청이 두 번 나가는 것을 막는다.
        if (pending) return;

        setPending(true);
        try {
            const url = `/${target}/${id}/likes`;
            const response = liked
                ? await api.delete<LikeApiResponse>(url)
                : await api.post<LikeApiResponse>(url);
            setLiked(response.data.liked);
            setCount(response.data.likeCount);
        } catch (error) {
            alert(errorMessage(error, '좋아요 처리에 실패했습니다.'));
        } finally {
            setPending(false);
        }
    };

    return { liked, count, pending, toggle };
};
