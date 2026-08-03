import type { PostSummary } from '../types/post';

interface PostTableProps {
    posts: PostSummary[];
    /** 글이 없을 때 보여줄 문구. 게시판 목록과 검색 결과가 다르다. */
    emptyMessage: string;
    onRowClick: (postId: number) => void;
}

const headCell = 'pb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle';

/*
 * 좁은 화면에서는 행을 블록으로 바꿔 제목 + 메타 한 줄로 접는다.
 * 마크업은 한 벌이고 CSS만 분기한다.
 */
const metaCellFirst = 'py-3 text-xs text-fg-muted max-sm:inline max-sm:p-0';
const metaCell = `${metaCellFirst} max-sm:before:mx-1.5 max-sm:before:content-['·']`;

const PostTable = ({ posts, emptyMessage, onRowClick }: PostTableProps) => {
    if (posts.length === 0) {
        return <p className="py-12 text-center text-sm text-fg-muted">{emptyMessage}</p>;
    }

    return (
        <table className="w-full border-collapse">
            <thead className="max-sm:hidden">
                <tr className="border-b border-border">
                    <th className={`${headCell} text-left`}>제목</th>
                    <th className={`${headCell} text-left`}>작성자</th>
                    <th className={`${headCell} text-left`}>작성일</th>
                    <th className={`${headCell} text-right`}>조회</th>
                    <th className={`${headCell} text-right`}>댓글</th>
                </tr>
            </thead>
            <tbody>
                {posts.map((post) => (
                    <tr
                        key={post.id}
                        onClick={() => onRowClick(post.id)}
                        className="cursor-pointer border-b border-divider hover:bg-surface max-sm:block max-sm:py-3"
                    >
                        <td className="max-w-0 py-3 pr-4 max-sm:block max-sm:max-w-none max-sm:p-0 max-sm:pb-1">
                            <span
                                title={post.title}
                                className="block truncate text-sm font-medium text-fg"
                            >
                                {post.title}
                            </span>
                        </td>
                        <td className={metaCellFirst}>{post.nickname}</td>
                        <td className={metaCell}>
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className={`${metaCell} text-right sm:text-right`}>
                            {/* 좁은 화면에는 열 헤더가 없다. 숫자만 남으면 뜻을 알 수 없다. */}
                            <span className="sm:hidden">조회 </span>
                            {post.viewCount}
                        </td>
                        <td className={`${metaCell} text-right sm:text-right`}>
                            <span className="sm:hidden">댓글 </span>
                            {post.commentsSize}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default PostTable;
