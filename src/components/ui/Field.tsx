import type { ReactNode } from 'react';

interface FieldProps {
    label: string;
    /** 입력의 id. 라벨 연결과 에러 id 생성에 함께 쓴다. */
    htmlFor: string;
    error?: string;
    children: ReactNode;
}

/**
 * 라벨 + 입력 + 에러 묶음.
 *
 * 검증 실패를 토스트가 아니라 여기에 붙이는 이유는, "비밀번호는 8자 이상"이
 * 어느 칸에 대한 말인지 알려줘야 쓸모가 있기 때문이다.
 *
 * aria 연결은 절반씩 나눠 맡는다. 여기서 에러 문단의 id를 만들고,
 * 입력에 aria-describedby와 aria-invalid를 거는 것은 호출부의 몫이다.
 */
export const Field = ({ label, htmlFor, error, children }: FieldProps) => (
    <div className="space-y-1.5">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
            {label}
        </label>
        {children}
        {error && (
            <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">
                {error}
            </p>
        )}
    </div>
);
