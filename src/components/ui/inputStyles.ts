// Fast Refresh 규칙상 컴포넌트 파일이 아닌 순수 모듈에서 스타일을 공유한다.
// 두 입력(Input, Textarea)의 테두리·포커스 링이 따로 놀지 않게 하기 위함이다.

export const inputBase =
    'w-full rounded-md border bg-surface px-3 py-2 text-sm text-fg ' +
    'placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-offset-0 ' +
    'disabled:opacity-50';

export const inputTone = (invalid?: boolean) =>
    invalid ? 'border-danger focus:ring-danger' : 'border-border focus:ring-accent';
