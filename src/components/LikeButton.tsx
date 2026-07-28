import { useLike } from '../hooks/useLike';
import type { LikeState, LikeTarget } from '../hooks/useLike';

interface LikeButtonProps {
    target: LikeTarget;
    id: number;
    /** 서버가 내려준 현재 상태. 부모가 재조회하면 이 값이 바뀌고 버튼이 따라간다. */
    initial: LikeState;
    size?: 'sm' | 'md';
}

const LikeButton = ({ target, id, initial, size = 'md' }: LikeButtonProps) => {
    const { liked, count, pending, toggle } = useLike(target, id, initial);

    return (
        <button
            type="button"
            onClick={toggle}
            disabled={pending}
            aria-label="좋아요"
            aria-pressed={liked}
            className={`inline-flex items-center gap-1 transition rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
            } ${liked ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
            <span>{count}</span>
        </button>
    );
};

export default LikeButton;
