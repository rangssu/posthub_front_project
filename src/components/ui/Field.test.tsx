import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';
import { Input } from './Input';

const renderField = (error?: string) =>
    render(
        <Field label="아이디" htmlFor="loginId" error={error}>
            <Input
                id="loginId"
                invalid={Boolean(error)}
                aria-describedby={error ? 'loginId-error' : undefined}
            />
        </Field>
    );

describe('Field', () => {
    it('라벨과 입력을 연결한다', () => {
        renderField();
        expect(screen.getByLabelText('아이디')).toBeInTheDocument();
    });

    it('에러가 없으면 에러 문구를 렌더링하지 않는다', () => {
        renderField();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('에러를 보여주고 입력과 aria로 연결한다', () => {
        renderField('아이디는 4자 이상 20자 이하여야 합니다.');

        const input = screen.getByLabelText('아이디');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAccessibleDescription('아이디는 4자 이상 20자 이하여야 합니다.');
        expect(screen.getByRole('alert')).toHaveTextContent(
            '아이디는 4자 이상 20자 이하여야 합니다.'
        );
    });
});
