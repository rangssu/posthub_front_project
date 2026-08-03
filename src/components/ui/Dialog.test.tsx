import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';
import { Button } from './Button';

/** 열기 버튼 → 다이얼로그. 포커스 복귀를 확인하려면 여는 주체가 필요하다. */
const Harness = ({ onConfirm = vi.fn() }: { onConfirm?: () => void }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button onClick={() => setOpen(true)}>삭제</Button>
            <Dialog
                open={open}
                title="게시글을 삭제할까요?"
                onClose={() => setOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setOpen(false)}>취소</Button>
                        <Button variant="danger" onClick={onConfirm}>삭제</Button>
                    </>
                }
            />
        </>
    );
};

/**
 * 게시판 이름 입력처럼 제어 컴포넌트를 children으로 담는 시나리오.
 * onClose가 매 렌더 새 함수(인라인 화살표)로 만들어지는데, 이 값이 effect
 * 의존성에 들어가면 타이핑할 때마다(부모 리렌더 → onClose 재생성) effect가
 * 다이얼로그가 열린 채로 재실행돼 포커스를 빼앗는지 확인한다.
 */
const HarnessWithInput = () => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    return (
        <>
            <Button onClick={() => setOpen(true)}>새 게시판</Button>
            <Dialog
                open={open}
                title="게시판 이름"
                onClose={() => setOpen(false)}
                footer={<Button onClick={() => setOpen(false)}>확인</Button>}
            >
                <input aria-label="게시판 이름 입력" value={name} onChange={(e) => setName(e.target.value)} />
            </Dialog>
        </>
    );
};

describe('Dialog', () => {
    it('닫혀 있으면 아무것도 렌더링하지 않는다', () => {
        render(<Harness />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('제목으로 이름이 붙는다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));

        expect(screen.getByRole('dialog', { name: '게시글을 삭제할까요?' })).toHaveAttribute(
            'aria-modal',
            'true'
        );
    });

    it('열면 다이얼로그 안으로 포커스가 들어간다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));

        const dialog = screen.getByRole('dialog');
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
    });

    it('Escape로 닫는다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('닫으면 열었던 버튼으로 포커스가 돌아온다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const opener = screen.getByRole('button', { name: '삭제' });

        await user.click(opener);
        await user.keyboard('{Escape}');

        expect(document.activeElement).toBe(opener);
    });

    it('Tab이 다이얼로그 밖으로 나가지 않는다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));

        const dialog = screen.getByRole('dialog');
        // 요소 수보다 많이 눌러도 계속 안에 머문다.
        for (let i = 0; i < 6; i += 1) {
            await user.tab();
            expect(dialog).toContainElement(document.activeElement as HTMLElement);
        }
    });

    it('열려 있는 동안 배경 스크롤을 잠그고, 닫으면 원래 값으로 복원한다', async () => {
        const user = userEvent.setup();
        // jsdom 기본값은 빈 문자열이라 'hidden'이 아닌 값을 미리 넣어둬야
        // "복원"과 "무조건 비움"을 구별할 수 있다.
        document.body.style.overflow = 'scroll';
        try {
            render(<Harness />);
            await user.click(screen.getByRole('button', { name: '삭제' }));
            expect(document.body.style.overflow).toBe('hidden');

            await user.keyboard('{Escape}');
            expect(document.body.style.overflow).toBe('scroll');
        } finally {
            document.body.style.overflow = '';
        }
    });

    it('Shift+Tab이 다이얼로그 밖으로 나가지 않는다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));

        const dialog = screen.getByRole('dialog');
        // 요소 수보다 많이 역방향으로 눌러도 계속 안에 머문다.
        for (let i = 0; i < 6; i += 1) {
            await user.tab({ shift: true });
            expect(dialog).toContainElement(document.activeElement as HTMLElement);
        }
    });

    it('description을 주면 접근 가능한 설명으로 연결되고, 주지 않으면 속성이 없다', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));

        expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby');

        const WithDescription = () => {
            const [open, setOpen] = useState(true);
            return (
                <Dialog
                    open={open}
                    title="게시글을 삭제할까요?"
                    description="삭제하면 되돌릴 수 없습니다."
                    onClose={() => setOpen(false)}
                    footer={<Button onClick={() => setOpen(false)}>확인</Button>}
                />
            );
        };
        rerender(<WithDescription />);

        expect(screen.getByRole('dialog')).toHaveAccessibleDescription('삭제하면 되돌릴 수 없습니다.');
    });

    it('입력 중 부모가 리렌더돼도 포커스와 입력값이 유지된다', async () => {
        const user = userEvent.setup();
        render(<HarnessWithInput />);
        await user.click(screen.getByRole('button', { name: '새 게시판' }));

        const input = screen.getByRole('textbox', { name: '게시판 이름 입력' });
        expect(document.activeElement).toBe(input);

        // input이 우연히 "첫 포커스 가능 요소"라서 effect가 재실행돼도 결국
        // 같은 곳으로 되돌아오면 activeElement 비교만으로는 잡히지 않는다.
        // 매 키 입력마다 blur가 한 번도 나면 안 된다는 것으로 실제 탈취를 잡는다.
        const blurSpy = vi.fn();
        input.addEventListener('blur', blurSpy);

        await user.type(input, '공지사항');

        expect(blurSpy).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(input);
        expect(input).toHaveValue('공지사항');
    });
});
