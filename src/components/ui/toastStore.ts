export type ToastKind = 'success' | 'error';

export interface ToastItem {
    id: number;
    kind: ToastKind;
    message: string;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const emit = () => {
    for (const listener of listeners) listener(toasts);
};

/** Provider가 구독한다. 구독 즉시 현재 목록을 한 번 받는다. */
export const subscribe = (listener: Listener) => {
    listeners.add(listener);
    listener(toasts);
    return () => {
        listeners.delete(listener);
    };
};

export const dismissToast = (id: number) => {
    toasts = toasts.filter((item) => item.id !== id);
    emit();
};

const push = (kind: ToastKind, message: string): number => {
    const id = nextId;
    nextId += 1;
    toasts = [...toasts, { id, kind, message }];
    emit();
    return id;
};

/**
 * 알림의 단일 진입점.
 *
 * 훅이 아니라 모듈 함수인 것이 핵심이다. axios 인터셉터처럼 React 트리 밖에서
 * 발생하는 알림(세션 만료)은 훅으로 부를 수 없다.
 */
export const toast = {
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
};

/** 테스트 전용. 모듈 전역 상태가 테스트 사이에 새는 것을 막는다. */
export const resetToasts = () => {
    toasts = [];
    nextId = 1;
    emit();
};
