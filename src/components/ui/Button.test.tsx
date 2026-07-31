import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
    it('자식을 버튼으로 렌더링한다', () => {
        render(<Button>글쓰기</Button>);
        expect(screen.getByRole('button', { name: '글쓰기' })).toBeInTheDocument();
    });

    it('클릭을 전달한다', async () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>확인</Button>);
        await userEvent.click(screen.getByRole('button', { name: '확인' }));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('disabled면 클릭이 전달되지 않는다', async () => {
        const onClick = vi.fn();
        render(<Button disabled onClick={onClick}>확인</Button>);
        await userEvent.click(screen.getByRole('button', { name: '확인' }));
        expect(onClick).not.toHaveBeenCalled();
    });

    it('type을 넘기지 않으면 button이다', () => {
        // 폼 안에서 기본값 submit으로 동작해 의도치 않게 제출되는 것을 막는다.
        render(<Button>취소</Button>);
        expect(screen.getByRole('button', { name: '취소' })).toHaveAttribute('type', 'button');
    });

    it('전달한 className을 덧붙인다', () => {
        render(<Button className="w-full">로그인</Button>);
        expect(screen.getByRole('button', { name: '로그인' })).toHaveClass('w-full');
    });
});
