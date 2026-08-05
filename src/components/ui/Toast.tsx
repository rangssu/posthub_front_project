import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { subscribe, dismissToast } from './toastStore';
import type { ToastItem } from './toastStore';

/** 토스트가 스스로 사라지기까지의 시간(ms). */
const AUTO_DISMISS_MS = 4000;

const ToastRow = ({ item }: { item: ToastItem }) => {
    useEffect(() => {
        const timer = setTimeout(() => dismissToast(item.id), AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [item.id]);

    const isError = item.kind === 'error';

    return (
        <div
            // 오류는 하던 일을 끊고 읽어야 하고, 성공은 기다렸다 읽어도 된다.
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            className={
                'pointer-events-auto flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-lg ' +
                (isError
                    ? 'border-danger bg-danger-subtle text-danger'
                    : 'border-border bg-surface text-fg')
            }
        >
            {/* 포인트 컬러가 초록이라 성공을 초록으로 칠하지 않는다. 브랜드색과 섞인다. */}
            <span aria-hidden="true">{isError ? '!' : '✓'}</span>
            <p className="flex-1">{item.message}</p>
            <button
                type="button"
                onClick={() => dismissToast(item.id)}
                aria-label="알림 닫기"
                className="text-fg-subtle hover:text-fg"
            >
                ×
            </button>
        </div>
    );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => subscribe(setToasts), []);

    return (
        <>
            {children}
            <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
                {toasts.map((item) => (
                    <ToastRow key={item.id} item={item} />
                ))}
            </div>
        </>
    );
};
