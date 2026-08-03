import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

interface DialogProps {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    /** 본문. 이름 입력 같은 폼 요소가 들어온다. */
    children?: ReactNode;
    /** 하단 버튼들. 보통 취소 + 확인. */
    footer: ReactNode;
}

const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), ' +
    'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * window.confirm과 window.prompt를 대체하는 모달.
 *
 * confirm은 동기라 호출부가 한 줄로 이어졌지만 이건 비동기다. 호출부는
 * "다이얼로그 열기 → 확인 클릭 → 그때 실행"으로 쪼개고, 무엇을 대상으로
 * 하는지를 상태로 들고 있어야 한다.
 */
export const Dialog = ({
    open,
    title,
    description,
    onClose,
    children,
    footer,
}: DialogProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const restoreRef = useRef<HTMLElement | null>(null);
    const titleId = useId();
    const descriptionId = useId();

    // 최신 onClose를 담아둔다. 호출부가 onClose={() => ...}처럼 인라인
    // 화살표를 넘기면(흔한 패턴이다) 부모가 리렌더될 때마다 새 함수가 되는데,
    // 이걸 effect 의존성에 그대로 넣으면 다이얼로그가 열려 있는 동안에도
    // 타이핑 한 글자마다 effect가 cleanup+setup을 다시 돌며 포커스를
    // 빼앗는다. ref로 우회해 effect는 open 전환에만 반응하게 한다.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!open) return;

        // 닫을 때 돌아갈 자리를 먼저 기억한다.
        restoreRef.current = document.activeElement as HTMLElement | null;

        const panel = panelRef.current;
        panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab' || !panel) return;

            const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (nodes.length === 0) return;

            const first = nodes[0];
            const last = nodes[nodes.length - 1];

            // 양 끝에서 순환시켜 포커스가 뒤 페이지로 새 나가지 않게 한다.
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
            restoreRef.current?.focus();
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 배경. 클릭하면 닫는다. 스크린 리더에는 필요 없다. */}
            <div
                className="absolute inset-0 bg-fg/40"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                className="relative w-full max-w-sm rounded-lg border border-border bg-bg p-5 shadow-xl"
            >
                <h2 id={titleId} className="text-base font-semibold text-fg">
                    {title}
                </h2>
                {description && (
                    <p id={descriptionId} className="mt-2 text-sm text-fg-muted">
                        {description}
                    </p>
                )}
                {children && <div className="mt-4">{children}</div>}
                <div className="mt-5 flex justify-end gap-2">{footer}</div>
            </div>
        </div>
    );
};
