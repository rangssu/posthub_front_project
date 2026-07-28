import { PAGE_WINDOW_SIZE } from '../constants/pagination';

interface PaginationProps {
    /** 0부터 세는 현재 페이지 (스프링과 같은 기준) */
    currentPage: number;
    totalPages: number;
    onChange: (page: number) => void;
}

/**
 * 현재 페이지를 중심으로 보여줄 페이지 번호를 고른다.
 * 양 끝에서는 윈도우가 밖으로 나가지 않도록 안쪽으로 붙인다.
 */
const visiblePages = (currentPage: number, totalPages: number): number[] => {
    const size = Math.min(PAGE_WINDOW_SIZE, totalPages);
    const half = Math.floor(PAGE_WINDOW_SIZE / 2);
    const start = Math.max(0, Math.min(currentPage - half, totalPages - size));

    return Array.from({ length: size }, (_, i) => start + i);
};

const Pagination = ({ currentPage, totalPages, onChange }: PaginationProps) => {
    if (totalPages <= 0) return null;

    return (
        <div className="flex items-center justify-center p-4 bg-white border-t border-gray-200 space-x-2">
            <button
                onClick={() => onChange(Math.max(currentPage - 1, 0))}
                disabled={currentPage === 0}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                이전
            </button>

            {visiblePages(currentPage, totalPages).map((page) => (
                <button
                    key={page}
                    onClick={() => onChange(page)}
                    className={`px-3 py-1 text-sm font-medium border rounded-md ${
                        currentPage === page
                            ? 'bg-blue-50 text-blue-600 border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    {page + 1}
                </button>
            ))}

            <button
                onClick={() => onChange(Math.min(currentPage + 1, totalPages - 1))}
                disabled={currentPage === totalPages - 1}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                다음
            </button>
        </div>
    );
};

export default Pagination;
