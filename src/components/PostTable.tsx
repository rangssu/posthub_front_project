import type { PostSummary } from '../types/post';

interface PostTableProps {
    posts: PostSummary[];
    /** 글이 없을 때 보여줄 문구. 게시판 목록과 검색 결과가 다르다. */
    emptyMessage: string;
    onRowClick: (postId: number) => void;
}

/** 목록에서 보여줄 제목 최대 길이. 넘으면 자르고 전체는 title 속성에 남긴다. */
const TITLE_DISPLAY_MAX = 20;

const headerClass = 'px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase';
const cellClass = 'px-6 py-4 text-center text-gray-500 whitespace-nowrap';

const PostTable = ({ posts, emptyMessage, onRowClick }: PostTableProps) => (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
            <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">제목</th>
                <th className={headerClass}>작성자</th>
                <th className={headerClass}>작성일</th>
                <th className={headerClass}>조회수</th>
                <th className={headerClass}>댓글</th>
            </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {posts.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">{emptyMessage}</td>
                </tr>
            ) : (
                posts.map((post) => (
                    <tr
                        key={post.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => onRowClick(post.id)}
                    >
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium text-gray-900" title={post.title}>
                                {post.title.length > TITLE_DISPLAY_MAX
                                    ? post.title.substring(0, TITLE_DISPLAY_MAX) + '...'
                                    : post.title}
                            </span>
                        </td>
                        <td className={cellClass}>{post.nickname}</td>
                        <td className={cellClass}>
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className={cellClass}>{post.viewCount}</td>
                        <td className={cellClass}>{post.commentsSize}</td>
                    </tr>
                ))
            )}
            </tbody>
        </table>
    </div>
);

export default PostTable;
