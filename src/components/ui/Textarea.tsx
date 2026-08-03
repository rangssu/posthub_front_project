import type { TextareaHTMLAttributes } from 'react';
import { inputBase, inputTone } from './Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    invalid?: boolean;
}

export const Textarea = ({ invalid, className = '', ...rest }: TextareaProps) => (
    <textarea
        aria-invalid={invalid || undefined}
        className={`${inputBase} ${inputTone(invalid)} resize-y ${className}`.trim()}
        {...rest}
    />
);
