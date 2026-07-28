import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination';

describe('Pagination', () => {
    it('페이지가 많아도 번호 버튼은 5개만 그린다', () => {
        render(<Pagination currentPage={0} totalPages={30} onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '6' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '이전' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument();
    });

    it('현재 페이지가 중간이면 그 주변 번호를 보여준다', () => {
        render(<Pagination currentPage={10} totalPages={30} onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '13' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
    });

    it('마지막 페이지 근처면 윈도우가 끝에 붙는다', () => {
        render(<Pagination currentPage={29} totalPages={30} onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: '26' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '30' })).toBeInTheDocument();
    });

    it('전체가 한 페이지면 번호 버튼은 1개다', () => {
        render(<Pagination currentPage={0} totalPages={1} onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument();
    });

    it('페이지가 없으면 아무것도 그리지 않는다', () => {
        const { container } = render(<Pagination currentPage={0} totalPages={0} onChange={vi.fn()} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('번호를 누르면 0부터 세는 페이지 번호를 넘긴다', async () => {
        const onChange = vi.fn();
        render(<Pagination currentPage={0} totalPages={30} onChange={onChange} />);

        await userEvent.click(screen.getByRole('button', { name: '3' }));

        expect(onChange).toHaveBeenCalledWith(2);
    });
});
