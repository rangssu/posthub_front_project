import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
}

const base =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
    primary: 'bg-accent text-accent-fg hover:opacity-90',
    secondary: 'border border-border bg-bg text-fg hover:bg-surface',
    ghost: 'text-fg-muted hover:bg-surface hover:text-fg',
    danger: 'bg-danger text-danger-fg hover:opacity-90',
};

const sizes: Record<Size, string> = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
};

/**
 * 기본 type이 'button'인 점이 중요하다. HTML 기본값은 'submit'이라
 * 폼 안에 놓인 취소 버튼이 폼을 제출해버린다.
 */
export const Button = ({
    variant = 'primary',
    size = 'md',
    className = '',
    type = 'button',
    ...rest
}: ButtonProps) => (
    <button
        type={type}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()}
        {...rest}
    />
);
