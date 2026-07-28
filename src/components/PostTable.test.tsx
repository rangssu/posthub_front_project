import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PostTable from './PostTable';
import type { PostSummary } from '../types/post';

const post = (overrides: Partial<PostSummary> = {}): PostSummary => ({
    id: 1,
    title: '게시글 제목',
    viewCount: 5,
    createdAt: '2026-07-24T10:00:00',
    userId: 1,
    nickname: '작성자',
    commentsSize: 3,
    ...overrides,
});

describe('PostTable', () => {
    it('댓글 수를 보여준다', () => {
        render(<PostTable posts={[post()]} emptyMessage="없음" onRowClick={vi.fn()} />);

        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('글이 없으면 전달받은 문구를 보여준다', () => {
        render(<PostTable posts={[]} emptyMessage="검색 결과가 없습니다." onRowClick={vi.fn()} />);

        expect(screen.getByText('검색 결과가 없습니다.')).toBeInTheDocument();
    });

    it('제목이 20자를 넘으면 잘라서 보여주되 전체 제목은 title 속성에 남긴다', () => {
        const longTitle = '가'.repeat(25);
        render(<PostTable posts={[post({ title: longTitle })]} emptyMessage="없음" onRowClick={vi.fn()} />);

        const cell = screen.getByTitle(longTitle);
        expect(cell).toHaveTextContent(`${'가'.repeat(20)}...`);
    });

    it('행을 클릭하면 글 id를 넘긴다', async () => {
        const onRowClick = vi.fn();
        render(<PostTable posts={[post({ id: 42 })]} emptyMessage="없음" onRowClick={onRowClick} />);

        await userEvent.click(screen.getByText('게시글 제목'));

        expect(onRowClick).toHaveBeenCalledWith(42);
    });
});
