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

    it('열려 있는 동안 배경 스크롤을 잠근다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));
        expect(document.body.style.overflow).toBe('hidden');

        await user.keyboard('{Escape}');
        expect(document.body.style.overflow).not.toBe('hidden');
    });
});
