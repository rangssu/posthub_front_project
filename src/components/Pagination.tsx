import { PAGE_WINDOW_SIZE } from '../constants/pagination';
import { Button } from './ui/Button';

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
        <div className="flex items-center justify-center space-x-2 border-t border-border bg-bg p-4">
            <Button
                variant="secondary"
                size="sm"
                onClick={() => onChange(Math.max(currentPage - 1, 0))}
                disabled={currentPage === 0}
            >
                이전
            </Button>

            {visiblePages(currentPage, totalPages).map((page) => (
                <Button
                    key={page}
                    variant={currentPage === page ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => onChange(page)}
                >
                    {page + 1}
                </Button>
            ))}

            <Button
                variant="secondary"
                size="sm"
                onClick={() => onChange(Math.min(currentPage + 1, totalPages - 1))}
                disabled={currentPage === totalPages - 1}
            >
                다음
            </Button>
        </div>
    );
};

export default Pagination;
