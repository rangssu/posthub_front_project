import { render, screen, within } from '@testing-library/react';
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

    it('제목이 길어도 자르지 않고 title 속성에도 전체를 남긴다', () => {
        // 이전에는 20자에서 잘라 '...'을 붙였다. 이제 자르지 않고 CSS 말줄임(truncate)에
        // 맡기므로, title 속성과 화면 텍스트 모두 전체 문자열이어야 한다.
        const longTitle = '가'.repeat(25);
        render(<PostTable posts={[post({ title: longTitle })]} emptyMessage="없음" onRowClick={vi.fn()} />);

        const cell = screen.getByTitle(longTitle);
        expect(cell).toHaveTextContent(longTitle);
    });

    it('행을 클릭하면 글 id를 넘긴다', async () => {
        const onRowClick = vi.fn();
        render(<PostTable posts={[post({ id: 42 })]} emptyMessage="없음" onRowClick={onRowClick} />);

        await userEvent.click(screen.getByText('게시글 제목'));

        expect(onRowClick).toHaveBeenCalledWith(42);
    });

    it('긴 제목을 잘라서 저장하지 않는다', () => {
        // 전에는 20자에서 잘라 '...'을 붙였다. 화면 폭과 무관하게 잘려
        // 넓은 화면에서도 제목이 반쪽만 보였다. 이제 CSS 말줄임에 맡긴다.
        const longTitle = '스프링 커넥션 풀 튜닝으로 커넥션 보유 시간을 줄인 이야기';
        render(
            <PostTable
                posts={[post({ title: longTitle })]}
                emptyMessage="작성된 게시글이 없습니다."
                onRowClick={() => {}}
            />
        );

        expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('좁은 화면에서 읽히도록 숫자에 라벨을 붙인다', () => {
        const { container } = render(
            <PostTable
                posts={[post({ viewCount: 142, commentsSize: 8 })]}
                emptyMessage="작성된 게시글이 없습니다."
                onRowClick={() => {}}
            />
        );

        // 열 헤더(thead)에도 같은 글자('조회', '댓글')가 있어 화면 전체에서 찾으면
        // 모호해진다. 좁은 화면에서 실제로 남는 라벨은 tbody 쪽이므로 범위를 좁힌다.
        const tbody = container.querySelector('tbody') as HTMLElement;
        expect(within(tbody).getByText('조회', { exact: false })).toBeInTheDocument();
        expect(within(tbody).getByText('댓글', { exact: false })).toBeInTheDocument();
    });
});
