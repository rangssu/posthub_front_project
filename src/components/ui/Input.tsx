import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    /** 검증에 걸린 입력. 테두리를 danger로 바꾸고 aria-invalid를 세운다. */
    invalid?: boolean;
}

export const inputBase =
    'w-full rounded-md border bg-surface px-3 py-2 text-sm text-fg ' +
    'placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-offset-0 ' +
    'disabled:opacity-50';

export const inputTone = (invalid?: boolean) =>
    invalid ? 'border-danger focus:ring-danger' : 'border-border focus:ring-accent';

export const Input = ({ invalid, className = '', ...rest }: InputProps) => (
    <input
        aria-invalid={invalid || undefined}
        className={`${inputBase} ${inputTone(invalid)} ${className}`.trim()}
        {...rest}
    />
);
