import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './Toast';
import { toast, resetToasts } from './toastStore';

afterEach(() => {
    // 모듈 전역 상태라 테스트 사이에 샌다.
    resetToasts();
    vi.useRealTimers();
});

describe('Toast', () => {
    it('React 밖에서 부른 토스트도 렌더링된다', async () => {
        render(<ToastProvider><div /></ToastProvider>);

        // axios 인터셉터가 하는 것과 같은 호출이다.
        act(() => {
            toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        });

        expect(
            await screen.findByText('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
        ).toBeInTheDocument();
    });

    it('오류는 assertive로, 성공은 polite로 읽힌다', async () => {
        render(<ToastProvider><div /></ToastProvider>);

        act(() => { toast.error('삭제에 실패했습니다.'); });
        expect(await screen.findByRole('alert')).toHaveTextContent('삭제에 실패했습니다.');

        act(() => { toast.success('저장했습니다.'); });
        expect(await screen.findByRole('status')).toHaveTextContent('저장했습니다.');
    });

    it('닫기 버튼으로 지운다', async () => {
        const user = userEvent.setup();
        render(<ToastProvider><div /></ToastProvider>);

        act(() => { toast.success('저장했습니다.'); });
        await screen.findByText('저장했습니다.');

        await user.click(screen.getByRole('button', { name: '알림 닫기' }));
        expect(screen.queryByText('저장했습니다.')).not.toBeInTheDocument();
    });

    it('시간이 지나면 스스로 사라진다', async () => {
        vi.useFakeTimers();
        render(<ToastProvider><div /></ToastProvider>);

        act(() => { toast.success('저장했습니다.'); });
        expect(screen.getByText('저장했습니다.')).toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(4000); });
        expect(screen.queryByText('저장했습니다.')).not.toBeInTheDocument();
    });
});
