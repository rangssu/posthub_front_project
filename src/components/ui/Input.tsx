import type { InputHTMLAttributes } from 'react';
import { inputBase, inputTone } from './inputStyles';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    /** 검증에 걸린 입력. 테두리를 danger로 바꾸고 aria-invalid를 세운다. */
    invalid?: boolean;
}

export const Input = ({ invalid, className = '', ...rest }: InputProps) => (
    <input
        aria-invalid={invalid || undefined}
        className={`${inputBase} ${inputTone(invalid)} ${className}`.trim()}
        {...rest}
    />
);
