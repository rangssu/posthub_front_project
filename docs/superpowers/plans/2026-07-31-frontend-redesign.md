# 프론트엔드 전면 리디자인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PostHub 프론트 7개 페이지를 디자인 토큰 기반 시스템 위에 다시 얹고, 브라우저 기본 팝업 42곳을 자체 UI로 교체한다.

**Architecture:** 아래에서 위로 쌓는다. CSS 변수로 토큰을 정의하고 Tailwind가 참조하게 한 뒤(1), 폼·다이얼로그·토스트 프리미티브를 만들고(2~5), 공통 레이아웃으로 페이지를 감싸고(6~7), 마지막에 페이지별로 팝업을 교체한다(8~12). 토스트는 React 트리 밖(axios 인터셉터)에서도 호출돼야 하므로 모듈 레벨 스토어를 두고 Provider가 구독한다.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Tailwind CSS 3.4.19, Vitest 4 + Testing Library. **새 런타임 의존성 없음.**

## Global Constraints

- **새 런타임 의존성을 추가하지 않는다.** `package.json`의 `dependencies`는 `axios`, `react`, `react-dom`, `react-router-dom` 넷으로 유지한다.
- **컴포넌트에서 팔레트 이름을 쓰지 않는다.** `text-stone-800`, `bg-emerald-600` 금지. 의미 토큰만 쓴다.
  유효한 **토큰 이름**은 13종이다 — `bg` `surface` `border` `divider` `fg` `fg-muted` `fg-subtle`
  `accent` `accent-fg` `accent-subtle` `danger` `danger-fg` `danger-subtle`. 여기에 Tailwind의 어떤
  색 접두사든 붙여 쓸 수 있다(`bg-surface`, `text-fg-muted`, `border-divider`, `ring-accent` 등).
  **이 13종에 없는 이름을 쓰면 Tailwind가 빌드 오류도 경고도 없이 조용히 무시한다.**
- **초록은 브랜드 포인트 전용이다.** 성공 신호로 쓰지 않는다. 성공 토스트는 무채색(`surface`), 오류만 `danger`.
- **한글 주석과 커밋 메시지**를 쓴다. 기존 코드 관례를 따른다. 커밋 메시지는 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`로 끝낸다.
- **`refreshClient.test.ts`의 경합 테스트를 건드리지 않는다.** 리프레시가 단일 비행이 아니면 토큰 계열 전체가 폐기돼 로그인 세션이 통째로 날아간다.
- **각 태스크 커밋 전** `npm run test`와 `npm run build`가 통과해야 한다.
- **`npm run lint`는 새 오류를 추가하지 않으면 된다.** 이 브랜치의 출발점에 이미 오류 6개가 있다 —
  `BoardPage` `LoginPage` `PostDetailPage` `PostEditPage` `SearchPage`의 `no-unused-vars`와
  `react-hooks/set-state-in-effect`다. 전부 T8~T11에서 다시 쓰는 파일이므로, **그 태스크들은
  자기가 손대는 파일의 기존 lint 오류까지 정리한다.** T12 종료 시점에 lint가 깨끗해야 한다.
- 브랜치: `feat/redesign`. 설계 문서: `docs/superpowers/specs/2026-07-31-frontend-redesign-design.md`.

---

## 파일 구조

**생성**

| 파일 | 책임 |
|---|---|
| `src/styles/tokens.css` | 라이트/다크 CSS 변수 정의. 유일한 색 출처 |
| `src/hooks/useTheme.ts` | 현재 테마 + 토글. `localStorage`와 시스템 설정 조정 |
| `src/components/ui/Button.tsx` | 버튼 4변형 × 2크기 |
| `src/components/ui/Input.tsx` | 단일행 입력 |
| `src/components/ui/Textarea.tsx` | 여러행 입력 |
| `src/components/ui/Field.tsx` | 라벨 + 입력 + 에러를 묶고 aria로 연결 |
| `src/components/ui/toastStore.ts` | 모듈 레벨 토스트 큐. React 밖에서도 호출 가능 |
| `src/components/ui/Toast.tsx` | `ToastProvider` + 렌더링 + 자동 소멸 |
| `src/components/ui/Dialog.tsx` | 모달. 포커스 트랩·Escape·스크롤 잠금·포커스 복귀 |
| `src/components/ThemeToggle.tsx` | 테마 전환 버튼 |
| `src/components/Header.tsx` | 로고·검색·테마 토글·로그인 상태 |
| `src/components/Layout.tsx` | 헤더 + 본문 폭 |

**삭제**: `src/App.css`

**수정**: `index.html`, `tailwind.config.js`, `src/index.css`, `src/App.tsx`, `src/test/setup.ts`,
`src/components/PostTable.tsx`, `src/components/SearchBox.tsx`, `src/components/Pagination.tsx`,
`src/components/LikeButton.tsx`, 7개 페이지, `src/hooks/useLike.ts`, `src/api/axios.ts`

---

### Task 1: 디자인 토큰과 테마 전환

**Files:**
- Create: `src/styles/tokens.css`, `src/hooks/useTheme.ts`, `src/hooks/useTheme.test.ts`
- Modify: `tailwind.config.js`, `src/index.css`, `index.html`, `src/test/setup.ts`
- Delete: `src/App.css`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: Tailwind 색 유틸리티 `bg-bg` `bg-surface` `border-border` `border-divider` `text-fg` `text-fg-muted` `text-fg-subtle` `bg-accent` `text-accent` `text-accent-fg` `bg-accent-subtle` `bg-danger` `text-danger` `text-danger-fg` `bg-danger-subtle`. `useTheme(): { theme: 'light' | 'dark'; toggle: () => void }`

**주의:** jsdom에는 `window.matchMedia`가 없다. Step 1에서 스텁을 넣지 않으면 `useTheme`을 쓰는 모든 테스트가 `TypeError`로 터진다.

- [ ] **Step 1: 테스트 셋업에 matchMedia 스텁 추가**

`src/test/setup.ts`에 추가:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom에는 matchMedia가 없다. useTheme이 이걸 부르므로 스텁이 없으면
// 테마를 건드리는 모든 테스트가 TypeError로 터진다.
if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
}

// 테스트마다 DOM을 비운다. 안 그러면 앞 테스트가 남긴 노드가 쿼리에 걸린다.
afterEach(() => {
    cleanup();
});
```

- [ ] **Step 2: 토큰 파일 작성**

`src/styles/tokens.css` 생성. Tailwind 투명도 수식어(`bg-bg/50`)를 살리려면 RGB 채널로 둬야 한다.

```css
/*
 * 색의 유일한 출처. 컴포넌트는 의미 이름(bg-surface, text-fg)만 쓰고
 * 팔레트 이름(stone-800)은 쓰지 않는다. 색을 바꿀 일이 생기면 이 파일만 고친다.
 *
 * Tailwind가 rgb(var(--color-x) / <alpha-value>)로 참조하므로 채널값으로 적는다.
 */
:root {
    --color-bg: 255 255 255;
    --color-surface: 250 250 249;
    --color-border: 231 229 228;
    --color-divider: 245 245 244;
    --color-fg: 28 25 23;
    --color-fg-muted: 120 113 108;
    --color-fg-subtle: 168 162 158;
    --color-accent: 4 120 87;
    --color-accent-fg: 255 255 255;
    --color-accent-subtle: 236 253 245;
    --color-danger: 185 28 28;
    --color-danger-fg: 255 255 255;
    --color-danger-subtle: 254 242 242;
}

.dark {
    --color-bg: 12 10 9;
    --color-surface: 28 25 23;
    --color-border: 41 37 36;
    --color-divider: 28 25 23;
    --color-fg: 250 250 249;
    --color-fg-muted: 168 162 158;
    --color-fg-subtle: 120 113 108;
    --color-accent: 52 211 153;
    --color-accent-fg: 5 46 33;
    --color-accent-subtle: 2 44 34;
    --color-danger: 248 113 113;
    --color-danger-fg: 69 10 10;
    --color-danger-subtle: 69 10 10;
}
```

- [ ] **Step 3: Tailwind 설정에 토큰 연결**

`tailwind.config.js` 전체를 교체:

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        divider: 'rgb(var(--color-divider) / <alpha-value>)',
        fg: 'rgb(var(--color-fg) / <alpha-value>)',
        'fg-muted': 'rgb(var(--color-fg-muted) / <alpha-value>)',
        'fg-subtle': 'rgb(var(--color-fg-subtle) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--color-accent-fg) / <alpha-value>)',
        'accent-subtle': 'rgb(var(--color-accent-subtle) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        'danger-fg': 'rgb(var(--color-danger-fg) / <alpha-value>)',
        'danger-subtle': 'rgb(var(--color-danger-subtle) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
```

`border` 색 이름은 Tailwind의 `border-<width>` 유틸리티와 충돌하지 않는다. 너비는 `border`/`border-2`, 색은 `border-border`로 각각 해석된다.

- [ ] **Step 4: 전역 스타일 정리**

`src/index.css` 전체를 교체:

```css
@import './styles/tokens.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
    body {
        @apply bg-bg text-fg antialiased;
    }
}
```

`src/App.css`를 삭제하고, `src/App.tsx`에 `import './App.css'`가 있다면 함께 지운다(현재는 없다).

Vite 보일러플레이트인 `#root { max-width: 1280px; margin: 0 auto; padding: 2rem; text-align: center }`가 사라진다. 폭과 정렬은 Task 6의 `Layout`이 책임진다.

- [ ] **Step 5: 첫 페인트 깜빡임 방지 스크립트**

`index.html`의 `<head>` 안, `</head>` 직전에 넣는다. 번들에 넣으면 React 마운트 뒤라 이미 늦어서 흰 화면이 번쩍인다.

```html
    <script>
      // React가 뜨기 전에 테마 클래스를 붙여야 다크모드 첫 페인트가 깜빡이지 않는다.
      (function () {
        try {
          var saved = localStorage.getItem('theme');
          var dark = saved
            ? saved === 'dark'
            : window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (dark) document.documentElement.classList.add('dark');
        } catch (e) {
          /* localStorage 접근이 막힌 환경에서는 라이트로 둔다 */
        }
      })();
    </script>
```

같은 파일에서 `<html lang="en">`을 `<html lang="ko">`로, `<title>posthub-front</title>`를 `<title>PostHub</title>`로 고친다.

- [ ] **Step 6: useTheme 실패 테스트 작성**

`src/hooks/useTheme.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
    });

    it('저장값이 없으면 시스템 설정을 따른다', () => {
        // setup.ts의 스텁이 matches: false라 라이트가 기본이다.
        const { result } = renderHook(() => useTheme());
        expect(result.current.theme).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('토글하면 다크가 되고 html에 dark 클래스가 붙는다', () => {
        const { result } = renderHook(() => useTheme());
        act(() => result.current.toggle());
        expect(result.current.theme).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('토글한 선택을 localStorage에 남긴다', () => {
        const { result } = renderHook(() => useTheme());
        act(() => result.current.toggle());
        expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('저장값이 있으면 시스템 설정보다 우선한다', () => {
        localStorage.setItem('theme', 'dark');
        const { result } = renderHook(() => useTheme());
        expect(result.current.theme).toBe('dark');
    });
});
```

- [ ] **Step 7: 테스트가 실패하는지 확인**

Run: `npm run test -- useTheme`
Expected: FAIL — `Failed to resolve import "./useTheme"`

- [ ] **Step 8: useTheme 구현**

`src/hooks/useTheme.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

/** 저장된 선택. 값이 없거나 이상하면 null. */
const readStored = (): Theme | null => {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
};

const systemPrefersDark = (): boolean => window.matchMedia(MEDIA_QUERY).matches;

/**
 * 테마 상태와 토글.
 *
 * 사용자가 한 번이라도 토글하면 그 선택이 시스템 설정을 이긴다. 토글 전에는
 * 시스템 설정을 실시간으로 따라간다(OS를 다크로 바꾸면 화면도 따라 바뀐다).
 */
export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(
        () => readStored() ?? (systemPrefersDark() ? 'dark' : 'light')
    );

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    useEffect(() => {
        const media = window.matchMedia(MEDIA_QUERY);
        const handleChange = (event: MediaQueryListEvent) => {
            // 사용자가 직접 고른 적이 있으면 시스템 변화를 무시한다.
            if (readStored()) return;
            setTheme(event.matches ? 'dark' : 'light');
        };
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    const toggle = useCallback(() => {
        setTheme((previous) => {
            const next: Theme = previous === 'dark' ? 'light' : 'dark';
            localStorage.setItem(STORAGE_KEY, next);
            return next;
        });
    }, []);

    return { theme, toggle };
};
```

- [ ] **Step 9: 테스트 통과 확인**

Run: `npm run test -- useTheme`
Expected: PASS (4 tests)

- [ ] **Step 10: 전체 검증**

Run: `npm run test`
Expected: 기존 44개 + 신규 4개 = 48개 통과

Run: `npm run build`
Expected: 성공

Run: `npm run lint`
Expected: 오류 없음

- [ ] **Step 11: 커밋**

```bash
git add -A
git commit -F - <<'EOF'
feat: 디자인 토큰과 테마 전환 기반

색이 컴포넌트마다 하드코딩돼 있었다(bg-blue-500 형태). CSS 변수로 의미
토큰을 정의하고 Tailwind가 참조하게 바꿔, 앞으로는 tokens.css 한 파일만
고치면 전체 색이 바뀐다. 투명도 수식어를 살리려 RGB 채널로 적었다.

App.css는 Vite 보일러플레이트라 지웠다. #root의 text-align:center와
padding이 모든 페이지 컨테이너와 싸우고 있었다. 폭은 앞으로 Layout이 맡는다.

테마 클래스는 index.html의 인라인 스크립트가 React 마운트 전에 붙인다.
번들에 넣으면 늦어서 다크모드 첫 페인트가 흰 화면으로 번쩍인다.

jsdom에는 matchMedia가 없어 테스트 셋업에 스텁을 넣었다. 없으면 테마를
건드리는 모든 테스트가 TypeError로 터진다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Button

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Button.test.tsx`

**Interfaces:**
- Consumes: Task 1의 색 유틸리티
- Produces: `Button` — props는 `ButtonHTMLAttributes<HTMLButtonElement>` 전체 + `variant?: 'primary' | 'secondary' | 'ghost' | 'danger'`(기본 `primary`) + `size?: 'sm' | 'md'`(기본 `md`)

- [ ] **Step 1: 실패 테스트 작성**

`src/components/ui/Button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
    it('자식을 버튼으로 렌더링한다', () => {
        render(<Button>글쓰기</Button>);
        expect(screen.getByRole('button', { name: '글쓰기' })).toBeInTheDocument();
    });

    it('클릭을 전달한다', async () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>확인</Button>);
        await userEvent.click(screen.getByRole('button', { name: '확인' }));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('disabled면 클릭이 전달되지 않는다', async () => {
        const onClick = vi.fn();
        render(<Button disabled onClick={onClick}>확인</Button>);
        await userEvent.click(screen.getByRole('button', { name: '확인' }));
        expect(onClick).not.toHaveBeenCalled();
    });

    it('type을 넘기지 않으면 button이다', () => {
        // 폼 안에서 기본값 submit으로 동작해 의도치 않게 제출되는 것을 막는다.
        render(<Button>취소</Button>);
        expect(screen.getByRole('button', { name: '취소' })).toHaveAttribute('type', 'button');
    });

    it('전달한 className을 덧붙인다', () => {
        render(<Button className="w-full">로그인</Button>);
        expect(screen.getByRole('button', { name: '로그인' })).toHaveClass('w-full');
    });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- Button`
Expected: FAIL — `Failed to resolve import "./Button"`

- [ ] **Step 3: 구현**

`src/components/ui/Button.tsx`:

```tsx
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
```

- [ ] **Step 4: 통과 확인**

Run: `npm run test -- Button`
Expected: PASS (5 tests)

- [ ] **Step 5: 전체 검증 후 커밋**

Run: `npm run test && npm run build && npm run lint`

```bash
git add -A
git commit -F - <<'EOF'
feat: Button 프리미티브

변형 넷(primary/secondary/ghost/danger)과 크기 둘을 한 곳에 모았다.
색은 전부 의미 토큰이라 팔레트를 바꿔도 이 파일은 그대로다.

기본 type을 'button'으로 뒀다. HTML 기본값이 'submit'이라 폼 안의
취소 버튼이 폼을 제출해버리는 사고가 흔하다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Input · Textarea · Field

**Files:**
- Create: `src/components/ui/Input.tsx`, `src/components/ui/Textarea.tsx`, `src/components/ui/Field.tsx`, `src/components/ui/Field.test.tsx`

**Interfaces:**
- Consumes: Task 1의 색 유틸리티
- Produces:
  - `Input` — `InputHTMLAttributes<HTMLInputElement>` + `invalid?: boolean`
  - `Textarea` — `TextareaHTMLAttributes<HTMLTextAreaElement>` + `invalid?: boolean`
  - `Field` — `{ label: string; htmlFor: string; error?: string; children: ReactNode }`. 에러가 있으면 `<p id={`${htmlFor}-error`}>`를 렌더링한다. **페이지는 입력에 `id={htmlFor}`, `aria-invalid`, `aria-describedby={`${htmlFor}-error`}`를 직접 걸어야 한다.**

- [ ] **Step 1: 실패 테스트 작성**

`src/components/ui/Field.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- Field`
Expected: FAIL — `Failed to resolve import "./Field"`

- [ ] **Step 3: Input 구현**

`src/components/ui/Input.tsx`:

```tsx
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
```

- [ ] **Step 4: Textarea 구현**

`src/components/ui/Textarea.tsx`:

```tsx
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
```

- [ ] **Step 5: Field 구현**

`src/components/ui/Field.tsx`:

```tsx
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
```

- [ ] **Step 6: 통과 확인**

Run: `npm run test -- Field`
Expected: PASS (3 tests)

- [ ] **Step 7: 전체 검증 후 커밋**

Run: `npm run test && npm run build && npm run lint`

```bash
git add -A
git commit -F - <<'EOF'
feat: Input·Textarea·Field 프리미티브

폼 검증 실패를 alert로 띄우던 것을 인라인 필드 에러로 바꾸기 위한 토대다.
Field가 라벨과 에러 문단을 렌더링하고 입력은 호출부가 aria-describedby로
연결한다. 에러 문단에 role="alert"를 걸어 스크린 리더가 즉시 읽는다.

Textarea는 Input의 클래스를 공유한다. 두 입력의 테두리·포커스 링이
따로 놀지 않게 하려는 것이다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Toast

**Files:**
- Create: `src/components/ui/toastStore.ts`, `src/components/ui/Toast.tsx`, `src/components/ui/Toast.test.tsx`

**Interfaces:**
- Consumes: Task 1의 색 유틸리티
- Produces:
  - `toast.success(message: string): number`, `toast.error(message: string): number` — **모듈 함수. React 밖에서도 부를 수 있다.**
  - `dismissToast(id: number): void`, `resetToasts(): void`(테스트용), `subscribe(listener): () => void`
  - `ToastProvider` — `{ children: ReactNode }`. 앱 최상단에 한 번 놓는다.

**왜 모듈 스토어인가:** `src/api/axios.ts:96`의 세션 만료 알림은 axios 인터셉터, 즉 React 트리 밖에서 발생한다. 훅으로는 호출할 수 없다.

- [ ] **Step 1: 실패 테스트 작성**

`src/components/ui/Toast.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './Toast';
import { toast, resetToasts } from './toastStore';

afterEach(() => {
    // 모듈 전역 상태라 테스트 사이에 샌다.
    resetToasts();
    vi.useRealTimers();
});

describe('Toast', () => {
    it('React 밖에서 부른 토스트도 렌더링된다', async () => {
        render(<ToastProvider><div /></ToastProvider>);

        // axios 인터셉터가 하는 것과 같은 호출이다.
        act(() => {
            toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        });

        expect(
            await screen.findByText('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
        ).toBeInTheDocument();
    });

    it('오류는 assertive로, 성공은 polite로 읽힌다', async () => {
        render(<ToastProvider><div /></ToastProvider>);

        act(() => { toast.error('삭제에 실패했습니다.'); });
        expect(await screen.findByRole('alert')).toHaveTextContent('삭제에 실패했습니다.');

        act(() => { toast.success('저장했습니다.'); });
        expect(await screen.findByRole('status')).toHaveTextContent('저장했습니다.');
    });

    it('닫기 버튼으로 지운다', async () => {
        const user = userEvent.setup();
        render(<ToastProvider><div /></ToastProvider>);

        act(() => { toast.success('저장했습니다.'); });
        await screen.findByText('저장했습니다.');

        await user.click(screen.getByRole('button', { name: '알림 닫기' }));
        expect(screen.queryByText('저장했습니다.')).not.toBeInTheDocument();
    });

    it('시간이 지나면 스스로 사라진다', async () => {
        vi.useFakeTimers();
        render(<ToastProvider><div /></ToastProvider>);

        act(() => { toast.success('저장했습니다.'); });
        expect(screen.getByText('저장했습니다.')).toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(4000); });
        expect(screen.queryByText('저장했습니다.')).not.toBeInTheDocument();
    });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- Toast`
Expected: FAIL — `Failed to resolve import "./Toast"`

- [ ] **Step 3: 스토어 구현**

`src/components/ui/toastStore.ts`:

```ts
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
```

- [ ] **Step 4: Provider 구현**

`src/components/ui/Toast.tsx`:

```tsx
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
```

- [ ] **Step 5: 통과 확인**

Run: `npm run test -- Toast`
Expected: PASS (4 tests)

- [ ] **Step 6: 전체 검증 후 커밋**

Run: `npm run test && npm run build && npm run lint`

```bash
git add -A
git commit -F - <<'EOF'
feat: Toast

alert를 대체한다. 훅이 아니라 모듈 함수(toast.error)로 만든 것이 핵심이다.
세션 만료 알림은 axios 인터셉터, 즉 React 트리 밖에서 발생해 훅으로는
부를 수 없다. 스토어를 모듈에 두고 Provider가 구독한다.

포인트 컬러가 초록이라 성공을 초록으로 칠하지 않았다. 브랜드색과 섞여
'성공'인지 '그냥 우리 색'인지 구분이 안 된다. 성공은 무채색, 오류만 빨강이다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Dialog

**Files:**
- Create: `src/components/ui/Dialog.tsx`, `src/components/ui/Dialog.test.tsx`

**Interfaces:**
- Consumes: Task 2의 `Button`, Task 1의 색 유틸리티
- Produces: `Dialog` — `{ open: boolean; title: string; description?: string; onClose: () => void; children?: ReactNode; footer: ReactNode }`

**직접 구축을 택한 대가가 여기 있다.** 아래를 하나도 빠뜨리면 안 된다: 열 때 첫 요소로 포커스, Tab 순환, Escape 닫기, 배경 스크롤 잠금, 닫을 때 원래 요소로 포커스 복귀, `role="dialog"` + `aria-modal` + `aria-labelledby`.

- [ ] **Step 1: 실패 테스트 작성**

`src/components/ui/Dialog.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';
import { Button } from './Button';

/** 열기 버튼 → 다이얼로그. 포커스 복귀를 확인하려면 여는 주체가 필요하다. */
const Harness = ({ onConfirm = vi.fn() }: { onConfirm?: () => void }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button onClick={() => setOpen(true)}>삭제</Button>
            <Dialog
                open={open}
                title="게시글을 삭제할까요?"
                onClose={() => setOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setOpen(false)}>취소</Button>
                        <Button variant="danger" onClick={onConfirm}>삭제</Button>
                    </>
                }
            />
        </>
    );
};

describe('Dialog', () => {
    it('닫혀 있으면 아무것도 렌더링하지 않는다', () => {
        render(<Harness />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('제목으로 이름이 붙는다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));

        expect(screen.getByRole('dialog', { name: '게시글을 삭제할까요?' })).toHaveAttribute(
            'aria-modal',
            'true'
        );
    });

    it('열면 다이얼로그 안으로 포커스가 들어간다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));

        const dialog = screen.getByRole('dialog');
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
    });

    it('Escape로 닫는다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('닫으면 열었던 버튼으로 포커스가 돌아온다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const opener = screen.getByRole('button', { name: '삭제' });

        await user.click(opener);
        await user.keyboard('{Escape}');

        expect(document.activeElement).toBe(opener);
    });

    it('Tab이 다이얼로그 밖으로 나가지 않는다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));

        const dialog = screen.getByRole('dialog');
        // 요소 수보다 많이 눌러도 계속 안에 머문다.
        for (let i = 0; i < 6; i += 1) {
            await user.tab();
            expect(dialog).toContainElement(document.activeElement as HTMLElement);
        }
    });

    it('열려 있는 동안 배경 스크롤을 잠근다', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.click(screen.getByRole('button', { name: '삭제' }));
        expect(document.body.style.overflow).toBe('hidden');

        await user.keyboard('{Escape}');
        expect(document.body.style.overflow).not.toBe('hidden');
    });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- Dialog`
Expected: FAIL — `Failed to resolve import "./Dialog"`

- [ ] **Step 3: 구현**

`src/components/ui/Dialog.tsx`:

```tsx
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
    const onCloseRef = useRef(onClose);

    /*
     * onClose를 ref에 담아 아래 effect의 의존성에서 뺀다.
     * 호출부가 onClose={() => setOpen(false)} 같은 인라인 화살표를 넘기면 매 렌더마다
     * 새 함수가 되는데, 그게 의존성에 있으면 다이얼로그가 열린 채로 effect가 다시 돌아
     * 포커스를 첫 요소로 되돌린다. 이름 입력 폼이 들어가면 한 글자마다 포커스가 날아간다.
     */
    useEffect(() => {
        onCloseRef.current = onClose;
    });
    const titleId = useId();
    const descriptionId = useId();

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
```

- [ ] **Step 4: 통과 확인**

Run: `npm run test -- Dialog`
Expected: PASS (7 tests)

- [ ] **Step 5: 전체 검증 후 커밋**

Run: `npm run test && npm run build && npm run lint`

```bash
git add -A
git commit -F - <<'EOF'
feat: Dialog

window.confirm과 prompt를 대체한다. 라이브러리 없이 만들기로 했으므로
접근성 처리를 직접 다 해야 한다 - 열 때 안으로 포커스, Tab 순환, Escape,
배경 스크롤 잠금, 닫을 때 원래 버튼으로 복귀. 전부 테스트로 덮었다.

포커스 복귀는 열기 전 activeElement를 기억했다가 정리 단계에서 되돌린다.
이게 없으면 모달을 닫은 뒤 키보드 사용자가 페이지 맨 위로 튕긴다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Layout · Header · ThemeToggle

**Files:**
- Create: `src/components/ThemeToggle.tsx`, `src/components/Header.tsx`, `src/components/Layout.tsx`, `src/components/Layout.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useTheme`(T1), `Button`(T2), `ToastProvider`(T4)
- Produces: `Layout` — `{ children: ReactNode; width?: 'content' | 'narrow' }`(기본 `content`). `narrow`는 로그인·회원가입용 좁은 폭.

**중요:** `SearchBox`는 지금 `BoardPage`에서만 쓰인다. 이제 `Header`로 옮겨 모든 페이지에서 검색할 수 있게 한다. Task 8에서 `BoardPage`의 중복 `SearchBox`를 제거한다.

- [ ] **Step 1: 실패 테스트 작성**

`src/components/Layout.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import Layout from './Layout';

const renderLayout = () =>
    render(
        <MemoryRouter>
            <Layout>
                <p>본문</p>
            </Layout>
        </MemoryRouter>
    );

afterEach(() => {
    localStorage.clear();
});

describe('Layout', () => {
    it('자식을 본문 영역에 렌더링한다', () => {
        renderLayout();
        expect(screen.getByText('본문')).toBeInTheDocument();
    });

    it('사이트 헤더와 로고를 보여준다', () => {
        renderLayout();
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'PostHub' })).toHaveAttribute('href', '/boards');
    });

    it('비로그인이면 로그인 버튼을 보여준다', () => {
        renderLayout();
        expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument();
    });

    it('로그인 상태면 로그아웃 버튼을 보여준다', () => {
        localStorage.setItem('accessToken', 'token');
        renderLayout();
        expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
    });

    it('테마 토글 버튼이 있다', () => {
        renderLayout();
        expect(screen.getByRole('button', { name: /테마/ })).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- Layout`
Expected: FAIL — `Failed to resolve import "./Layout"`

- [ ] **Step 3: ThemeToggle 구현**

`src/components/ThemeToggle.tsx`:

```tsx
import { useTheme } from '../hooks/useTheme';
import { Button } from './ui/Button';

export const ThemeToggle = () => {
    const { theme, toggle } = useTheme();
    const label = theme === 'dark' ? '밝은 테마로 전환' : '어두운 테마로 전환';

    return (
        <Button variant="ghost" size="sm" onClick={toggle} aria-label={label} title={label}>
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
        </Button>
    );
};
```

- [ ] **Step 4: Header 구현**

`src/components/Header.tsx`:

```tsx
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import SearchBox from './SearchBox';
import { Button } from './ui/Button';
import { ThemeToggle } from './ThemeToggle';
import { toast } from './ui/toastStore';

/**
 * 사이트 공통 헤더.
 *
 * 전에는 BoardPage 안에 직접 박혀 있어서 나머지 6개 페이지는 로고도
 * 로그인 상태도 없이 떴다.
 */
const Header = () => {
    const navigate = useNavigate();
    const isLoggedIn = Boolean(localStorage.getItem('accessToken'));

    const handleLogout = async () => {
        /*
         * 서버에도 알려야 로그아웃이 실제로 끝난다. 리프레시 토큰은 httpOnly
         * 쿠키라 프론트가 지울 수 없고, 서버가 계열을 폐기하지 않으면 그 쿠키로
         * 계속 새 액세스 토큰을 받아갈 수 있다.
         *
         * 실패해도 로컬 정리는 진행한다. 서버가 죽었다고 로그아웃이 막히면 안 된다.
         */
        try {
            await api.post('/auth/logout');
        } catch {
            console.warn('서버 로그아웃에 실패했습니다. 로컬 인증 정보만 정리합니다.');
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('role');
        toast.success('로그아웃했습니다.');
        navigate('/boards');
    };

    return (
        <header role="banner" className="border-b border-border">
            <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
                <Link
                    to="/boards"
                    className="text-lg font-semibold tracking-tight text-fg hover:text-accent"
                >
                    PostHub
                </Link>

                <div className="ml-auto flex items-center gap-2">
                    <div className="hidden sm:block">
                        <SearchBox />
                    </div>
                    <ThemeToggle />
                    {isLoggedIn ? (
                        <Button variant="secondary" size="sm" onClick={handleLogout}>
                            로그아웃
                        </Button>
                    ) : (
                        <Button size="sm" onClick={() => navigate('/login')}>
                            로그인
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
```

**주의:** 로그아웃 뒤 기존 코드는 `window.location.reload()`를 불렀다. 토스트가 리로드로 사라지므로 `navigate`로 바꿨다. `isLoggedIn`이 `localStorage`를 직접 읽어 리렌더가 안 되는 문제는 남아 있으나, 이 작업 범위(디자인)를 넘는 상태 관리 변경이므로 건드리지 않는다. 로그아웃 후 헤더 갱신이 필요하면 이후 별도 작업으로 다룬다.

- [ ] **Step 5: Layout 구현**

`src/components/Layout.tsx`:

```tsx
import type { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
    children: ReactNode;
    /** narrow는 로그인·회원가입처럼 폼 하나만 있는 화면용. */
    width?: 'content' | 'narrow';
}

/**
 * 헤더 + 본문 폭.
 *
 * App.css를 지우면서 #root의 max-width와 가운데 정렬이 사라졌다.
 * 폭은 이제 여기서만 정한다.
 */
const Layout = ({ children, width = 'content' }: LayoutProps) => (
    <div className="min-h-screen bg-bg">
        <Header />
        <main className={`mx-auto px-4 py-8 ${width === 'narrow' ? 'max-w-sm' : 'max-w-4xl'}`}>
            {children}
        </main>
    </div>
);

export default Layout;
```

- [ ] **Step 6: App에 ToastProvider 연결**

`src/App.tsx`에서 `BrowserRouter`를 `ToastProvider`로 감싼다. 라우트 구조는 그대로 둔다.

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import BoardPage from './pages/BoardPage';
import PostDetailPage from './pages/PostDetailPage';
import PostWritePage from './pages/PostWritePage';
import PostEditPage from './pages/PostEditPage';
import SearchPage from './pages/SearchPage';

function App() {
    return (
        <ToastProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/boards" replace />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/boards" element={<BoardPage />} />
                    {/* 검색어와 페이지는 쿼리스트링(?q=&page=)으로 받는다. */}
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/posts/:postId" element={<PostDetailPage />} />
                    <Route path="/boards/:boardId/write" element={<PostWritePage />} />
                    <Route path="/posts/:postId/edit" element={<PostEditPage />} />
                </Routes>
            </BrowserRouter>
        </ToastProvider>
    );
}

export default App;
```

- [ ] **Step 7: 통과 확인**

Run: `npm run test -- Layout`
Expected: PASS (5 tests)

- [ ] **Step 8: 전체 검증 후 커밋**

Run: `npm run test && npm run build && npm run lint`

기존 `BoardPage.test.tsx`가 헤더를 기대하지 않으므로 아직 통과해야 한다. 실패하면 Task 8에서 다루지 말고 여기서 원인을 확인한다.

```bash
git add -A
git commit -F - <<'EOF'
feat: 공통 레이아웃과 헤더

사이트 헤더가 BoardPage에만 있었다. 나머지 6개 페이지는 로고도 로그인
상태도 없이 떴고 SearchPage는 제목조차 없었다. Layout으로 묶어 7개
페이지가 같은 헤더를 쓴다.

검색창도 헤더로 올렸다. 전에는 게시판 목록에서만 검색할 수 있었다.

App.css를 지우면서 사라진 #root의 폭 제한을 Layout이 이어받는다.
로그인·회원가입은 좁은 폭(narrow), 나머지는 본문 폭을 쓴다.

로그아웃 뒤 window.location.reload() 대신 navigate를 쓴다. 리로드하면
방금 띄운 토스트가 같이 날아간다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 7: 공통 컴포넌트 4종 리디자인

**Files:**
- Modify: `src/components/PostTable.tsx`, `src/components/PostTable.test.tsx`
- Modify: `src/components/SearchBox.tsx`, `src/components/Pagination.tsx`, `src/components/LikeButton.tsx`

**Interfaces:**
- Consumes: Task 1의 색 유틸리티
- Produces: `PostTable` — props 시그니처는 그대로(`{ posts: PostSummary[]; emptyMessage: string; onRowClick: (postId: number) => void }`). 호출부는 손대지 않는다.

**바뀌는 것:** 그림자·라운드·회색 헤더 배경 제거, 조회/댓글 오른쪽 정렬, `TITLE_DISPLAY_MAX`(20자 자르기) 제거, 좁은 화면에서 메타 한 줄로 접기.

- [ ] **Step 1: 기존 테스트 확인**

Run: `npm run test -- PostTable`
Expected: PASS. 어떤 단언이 걸려 있는지 읽고 다음 단계에서 무엇이 깨질지 파악한다.

- [ ] **Step 2: 제목 자르기 제거를 검증하는 테스트 추가**

`src/components/PostTable.test.tsx`에 추가:

```tsx
it('긴 제목을 잘라서 저장하지 않는다', () => {
    // 전에는 20자에서 잘라 '...'을 붙였다. 화면 폭과 무관하게 잘려
    // 넓은 화면에서도 제목이 반쪽만 보였다. 이제 CSS 말줄임에 맡긴다.
    const longTitle = '스프링 커넥션 풀 튜닝으로 커넥션 보유 시간을 줄인 이야기';
    render(
        <PostTable
            posts={[{ ...basePost, title: longTitle }]}
            emptyMessage="작성된 게시글이 없습니다."
            onRowClick={() => {}}
        />
    );

    expect(screen.getByText(longTitle)).toBeInTheDocument();
});

it('좁은 화면에서 읽히도록 숫자에 라벨을 붙인다', () => {
    render(
        <PostTable
            posts={[{ ...basePost, viewCount: 142, commentsSize: 8 }]}
            emptyMessage="작성된 게시글이 없습니다."
            onRowClick={() => {}}
        />
    );

    // 열 헤더가 사라지는 좁은 화면에서 '142'만 남으면 무슨 값인지 알 수 없다.
    expect(screen.getByText('조회', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('댓글', { exact: false })).toBeInTheDocument();
});
```

`basePost`가 파일에 없으면 `src/test/fixtures.ts`의 기존 픽스처를 쓰거나, 파일 상단에 `PostSummary` 전 필드를 채운 상수를 만든다:

```tsx
const basePost = {
    id: 1,
    title: '스프링 커넥션 풀 튜닝 후기',
    viewCount: 142,
    createdAt: '2026-07-29T10:00:00',
    userId: 1,
    nickname: '랑수',
    commentsSize: 8,
};
```

- [ ] **Step 3: 실패 확인**

Run: `npm run test -- PostTable`
Expected: FAIL — 긴 제목 테스트가 `...`으로 잘린 텍스트 때문에 실패

- [ ] **Step 4: 구현**

`src/components/PostTable.tsx` 전체 교체:

```tsx
import type { PostSummary } from '../types/post';

interface PostTableProps {
    posts: PostSummary[];
    /** 글이 없을 때 보여줄 문구. 게시판 목록과 검색 결과가 다르다. */
    emptyMessage: string;
    onRowClick: (postId: number) => void;
}

const headCell = 'pb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle';

/*
 * 좁은 화면에서는 행을 블록으로 바꿔 제목 + 메타 한 줄로 접는다.
 * 마크업은 한 벌이고 CSS만 분기한다.
 */
const metaCellFirst = 'py-3 text-xs text-fg-muted max-sm:inline max-sm:p-0';
const metaCell = `${metaCellFirst} max-sm:before:mx-1.5 max-sm:before:content-['·']`;

const PostTable = ({ posts, emptyMessage, onRowClick }: PostTableProps) => {
    if (posts.length === 0) {
        return <p className="py-12 text-center text-sm text-fg-muted">{emptyMessage}</p>;
    }

    return (
        <table className="w-full border-collapse">
            <thead className="max-sm:hidden">
                <tr className="border-b border-border">
                    <th className={`${headCell} text-left`}>제목</th>
                    <th className={`${headCell} text-left`}>작성자</th>
                    <th className={`${headCell} text-left`}>작성일</th>
                    <th className={`${headCell} text-right`}>조회</th>
                    <th className={`${headCell} text-right`}>댓글</th>
                </tr>
            </thead>
            <tbody>
                {posts.map((post) => (
                    <tr
                        key={post.id}
                        onClick={() => onRowClick(post.id)}
                        className="cursor-pointer border-b border-divider hover:bg-surface max-sm:block max-sm:py-3"
                    >
                        <td className="max-w-0 py-3 pr-4 max-sm:block max-sm:max-w-none max-sm:p-0 max-sm:pb-1">
                            <span
                                title={post.title}
                                className="block truncate text-sm font-medium text-fg"
                            >
                                {post.title}
                            </span>
                        </td>
                        <td className={metaCellFirst}>{post.nickname}</td>
                        <td className={metaCell}>
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className={`${metaCell} text-right sm:text-right`}>
                            {/* 좁은 화면에는 열 헤더가 없다. 숫자만 남으면 뜻을 알 수 없다. */}
                            <span className="sm:hidden">조회 </span>
                            {post.viewCount}
                        </td>
                        <td className={`${metaCell} text-right sm:text-right`}>
                            <span className="sm:hidden">댓글 </span>
                            {post.commentsSize}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default PostTable;
```

`max-w-0` + `truncate`는 테이블 셀에서 말줄임을 동작시키는 표준 수법이다. 셀에 고유 폭이 없어야 `text-overflow`가 걸린다.

- [ ] **Step 5: 통과 확인**

Run: `npm run test -- PostTable`
Expected: PASS. 빈 목록 단언이 `<td colSpan>`을 기대하고 있었다면 `<p>`로 바뀌었으므로 테스트를 함께 고친다 — 문구 기반 단언(`screen.getByText('작성된 게시글이 없습니다.')`)으로 바꾸면 마크업에 덜 민감해진다.

- [ ] **Step 6: 나머지 공통 컴포넌트 3종을 토큰으로 옮기기**

`SearchBox`·`Pagination`·`LikeButton`이 아직 팔레트 색을 직접 쓰고 있다
(`bg-blue-600`, `text-gray-700`, `border-gray-300`, `text-red-500` 등).
`SearchBox`는 이제 헤더에 실려 **모든 페이지에 뜨므로** 이걸 남겨두면
전면 리디자인이 절반만 된 상태가 된다.

세 파일의 색·테두리·포커스 링 클래스를 13종 토큰으로 바꾼다. 대응은 이렇게 잡는다:

| 기존 | 바꿀 토큰 |
|---|---|
| `text-gray-900`, `text-gray-800` | `text-fg` |
| `text-gray-700`, `text-gray-500` | `text-fg-muted` |
| `text-gray-400`, `placeholder` 계열 | `text-fg-subtle` |
| `border-gray-300`, `border-gray-200` | `border-border` |
| `bg-white` | `bg-bg` (입력·카드 배경은 `bg-surface`) |
| `bg-gray-50`, `bg-gray-100` (hover) | `bg-surface` |
| `bg-blue-600`, `bg-blue-500`, `text-blue-*` | `bg-accent` / `text-accent` (+ 글자는 `text-accent-fg`) |
| `text-red-*`, `bg-red-*` | `danger` 계열 |

**버튼은 가능하면 `Button` 프리미티브로 교체한다.** `Pagination`의 페이지 버튼과
`SearchBox`의 검색 버튼이 해당한다. 활성 페이지는 `bg-accent text-accent-fg`,
비활성은 `variant="secondary"`로 둔다.

**동작·props·DOM 구조는 바꾸지 않는다.** 세 컴포넌트 모두 기존 테스트가 있으므로
그대로 통과해야 한다. 통과하지 않으면 구조를 바꾼 것이니 되돌린다.

`LikeButton`은 좋아요 눌린 상태를 색으로 구분한다 — 눌림은 `text-accent`,
안 눌림은 `text-fg-muted`로 둔다.

- [ ] **Step 7: 전체 검증 후 커밋**

Run: `npm run test && npm run build && npm run lint`

```bash
git add -A
git commit -F - <<'EOF'
perf: 게시글 목록 테이블 정제와 모바일 대응

그림자·라운드·회색 헤더 배경을 걷어내고 선으로만 구분한다. 조회수와
댓글은 오른쪽 정렬해 숫자열을 눈으로 훑을 수 있게 했다.

제목을 20자에서 자르던 TITLE_DISPLAY_MAX를 없앴다. 화면 폭과 무관하게
잘려서 넓은 화면에서도 제목이 반쪽만 보였다. CSS 말줄임으로 넘긴다.

좁은 화면에서는 행을 블록으로 바꿔 제목 + 메타 한 줄로 접는다. 마크업은
한 벌이고 CSS만 분기한다. 열 헤더가 사라지므로 숫자에 '조회'·'댓글'
라벨을 붙였다 - 안 그러면 142와 8이 무슨 값인지 알 수 없다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 8: BoardPage 팝업 교체

**Files:**
- Modify: `src/pages/BoardPage.tsx`, `src/pages/BoardPage.test.tsx`

**Interfaces:**
- Consumes: `Layout`(T6), `Button`(T2), `Dialog`(T5), `Input`(T3), `toast`(T4), `PostTable`(T7)
- Produces: 없음 (페이지)

**교체 대상 10곳:** `prompt` 2(게시판 생성·수정), `confirm` 1(게시판 삭제), `alert` 7.

여기서 **제어 흐름이 실제로 바뀐다.** `window.prompt`는 값을 즉시 돌려주지만 `Dialog`는 그렇지 않다. "어떤 게시판을 무엇으로 바꾸려는지"를 상태로 들고 있어야 한다.

- [ ] **Step 1: 다이얼로그 상태 타입 정의**

`BoardPage.tsx` 상단에 추가. 세 가지 다이얼로그가 한 번에 하나만 열리므로 단일 상태로 표현한다.

```tsx
/**
 * 열려 있는 다이얼로그와 그 대상.
 *
 * window.confirm/prompt는 동기라 호출부가 한 줄로 이어졌지만 다이얼로그는
 * 비동기다. "무엇에 대한 확인인지"를 여기 담아 확인 클릭 시점까지 들고 간다.
 */
type BoardDialog =
    | { kind: 'none' }
    | { kind: 'create' }
    | { kind: 'rename'; boardId: number; currentName: string }
    | { kind: 'delete'; boardId: number; boardName: string };
```

- [ ] **Step 2: 실패 테스트 작성**

`src/pages/BoardPage.test.tsx`에 추가. 기존 테스트의 렌더 헬퍼와 axios 모킹 방식을 그대로 따른다.

```tsx
it('게시판 삭제는 확인 다이얼로그를 거친다', async () => {
    const user = userEvent.setup();
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('role', 'ADMIN');

    renderBoardPage(); // 기존 헬퍼

    // 관리자에게만 보이는 삭제 버튼
    await user.click(await screen.findByRole('button', { name: '게시판 삭제' }));

    // 이 시점에는 아직 API가 나가지 않아야 한다.
    expect(mockDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '삭제' }));
    expect(mockDelete).toHaveBeenCalledWith('/boards/1');
});

it('삭제 다이얼로그에서 취소하면 아무것도 지우지 않는다', async () => {
    const user = userEvent.setup();
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('role', 'ADMIN');

    renderBoardPage();

    await user.click(await screen.findByRole('button', { name: '게시판 삭제' }));
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(mockDelete).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm run test -- BoardPage`
Expected: FAIL — 확인 다이얼로그가 없어 `mockDelete`가 곧바로 호출됨

- [ ] **Step 4: 핸들러를 두 단계로 쪼개기**

기존 세 핸들러를 "여는 것"과 "실행하는 것"으로 나눈다.

```tsx
const [dialog, setDialog] = useState<BoardDialog>({ kind: 'none' });
const [boardName, setBoardName] = useState('');

const closeDialog = () => {
    setDialog({ kind: 'none' });
    setBoardName('');
};

const openCreate = () => {
    setBoardName('');
    setDialog({ kind: 'create' });
};

const openRename = (boardId: number, currentName: string) => {
    setBoardName(currentName);
    setDialog({ kind: 'rename', boardId, currentName });
};

const openDelete = (boardId: number, name: string) => {
    setDialog({ kind: 'delete', boardId, boardName: name });
};

const submitCreate = async () => {
    const name = boardName.trim();
    if (!name) return;

    try {
        await api.post('/boards', { boardName: name });
        toast.success('게시판을 만들었습니다.');
        closeDialog();
        fetchBoards();
    } catch (error) {
        toast.error(errorMessage(error, '게시판 생성에 실패했습니다.'));
    }
};

const submitRename = async () => {
    if (dialog.kind !== 'rename') return;
    const name = boardName.trim();
    if (!name || name === dialog.currentName) {
        closeDialog();
        return;
    }

    try {
        await api.put(`/boards/${dialog.boardId}`, { boardName: name });
        toast.success('게시판 이름을 바꿨습니다.');
        closeDialog();
        fetchBoards();
    } catch (error) {
        toast.error(errorMessage(error, '게시판 수정에 실패했습니다.'));
    }
};

const submitDelete = async () => {
    if (dialog.kind !== 'delete') return;

    try {
        await api.delete(`/boards/${dialog.boardId}`);
        toast.success('게시판을 삭제했습니다.');
        if (activeBoardId === dialog.boardId) setActiveBoardId(null);
        closeDialog();
        fetchBoards();
    } catch (error) {
        toast.error(errorMessage(error, '게시판 삭제에 실패했습니다.'));
    }
};
```

- [ ] **Step 5: 다이얼로그 렌더링 추가**

컴포넌트 반환부 끝(`</Layout>` 직전)에 넣는다.

```tsx
<Dialog
    open={dialog.kind === 'create' || dialog.kind === 'rename'}
    title={dialog.kind === 'rename' ? '게시판 이름 바꾸기' : '새 게시판 만들기'}
    onClose={closeDialog}
    footer={
        <>
            <Button variant="secondary" onClick={closeDialog}>취소</Button>
            <Button onClick={dialog.kind === 'rename' ? submitRename : submitCreate}>
                {dialog.kind === 'rename' ? '변경' : '만들기'}
            </Button>
        </>
    }
>
    <Field label="게시판 이름" htmlFor="boardName">
        <Input
            id="boardName"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            placeholder="예: 자유게시판"
        />
    </Field>
</Dialog>

<Dialog
    open={dialog.kind === 'delete'}
    title="게시판을 삭제할까요?"
    description={
        dialog.kind === 'delete'
            ? `'${dialog.boardName}'을(를) 삭제합니다. 게시글이 하나라도 남아 있으면 삭제되지 않습니다.`
            : undefined
    }
    onClose={closeDialog}
    footer={
        <>
            <Button variant="secondary" onClick={closeDialog}>취소</Button>
            <Button variant="danger" onClick={submitDelete}>삭제</Button>
        </>
    }
/>
```

- [ ] **Step 6: 나머지 정리**

- `handleLogout`과 헤더 마크업을 **삭제한다.** Task 6의 `Header`가 맡는다.
- `<SearchBox />`와 그 감싼 `<div className="mb-6">`를 **삭제한다.** 검색은 헤더에 있다.
- 최상위 `<div className="max-w-4xl px-4 py-8 mx-auto">`를 `<Layout>`으로 교체한다.
- 게시판 탭 버튼 색을 토큰으로 바꾼다: 활성 `bg-accent-subtle text-accent`, 비활성 `text-fg-muted hover:bg-surface`.
- 수정·삭제 아이콘 버튼에 `aria-label="게시판 이름 수정"` / `aria-label="게시판 삭제"`를 단다. 이모지만으로는 접근 가능한 이름이 없어 테스트에서도 잡히지 않는다.
- `vi.stubGlobal('alert', vi.fn())`을 테스트에서 제거한다.

- [ ] **Step 7: 통과 확인**

Run: `npm run test -- BoardPage`
Expected: PASS

- [ ] **Step 8: 전체 검증 후 커밋**

Run: `npm run test && npm run build && npm run lint`

```bash
git add -A
git commit -F - <<'EOF'
refactor: 게시판 화면의 브라우저 팝업 제거

prompt 2곳, confirm 1곳, alert 7곳을 걷어냈다. 관리자 화면이 브라우저
기본 프롬프트로 게시판 이름을 받고 있었다.

confirm과 prompt는 동기라 핸들러가 한 줄로 이어졌지만 다이얼로그는
비동기다. "무엇을 지우려던 건지"를 상태로 들고 확인 클릭까지 가져가도록
핸들러를 열기/실행 두 단계로 쪼갰다.

헤더와 검색창은 Layout으로 옮겼으므로 여기서 지웠다. 이모지 아이콘
버튼에는 aria-label을 달았다 - 접근 가능한 이름이 없어 스크린 리더에도
테스트에도 잡히지 않았다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 9: PostDetailPage 팝업 교체

**Files:**
- Modify: `src/pages/PostDetailPage.tsx`, `src/pages/PostDetailPage.test.tsx`

**Interfaces:**
- Consumes: `Layout`(T6), `Button`(T2), `Dialog`(T5), `Textarea`·`Field`(T3), `toast`(T4)

**교체 대상 10곳:** `confirm` 2(게시글 삭제, 댓글 삭제), 댓글 검증 `alert` 1 → 인라인, 나머지 `alert` 7 → 토스트.

- [ ] **Step 1: 다이얼로그 상태 타입 정의**

```tsx
/** 삭제 확인 대상. 댓글은 어느 댓글인지 id를 들고 있어야 한다. */
type DeleteTarget =
    | { kind: 'none' }
    | { kind: 'post' }
    | { kind: 'comment'; commentId: number };
```

- [ ] **Step 2: 실패 테스트 작성**

```tsx
it('게시글 삭제는 확인을 거친다', async () => {
    const user = userEvent.setup();
    renderPostDetail(); // 기존 헬퍼

    await user.click(await screen.findByRole('button', { name: '삭제' }));
    expect(mockDelete).not.toHaveBeenCalled();

    // 다이얼로그 안의 삭제 버튼
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));

    expect(mockDelete).toHaveBeenCalledWith('/posts/1');
});

it('빈 댓글은 인라인 오류를 보여주고 전송하지 않는다', async () => {
    const user = userEvent.setup();
    renderPostDetail();

    await user.click(await screen.findByRole('button', { name: '댓글 등록' }));

    expect(screen.getByRole('alert')).toHaveTextContent('댓글 내용을 입력해주세요.');
    expect(mockPost).not.toHaveBeenCalled();
});
```

`within`을 `@testing-library/react`에서 import 한다. 페이지의 삭제 버튼과 다이얼로그의 삭제 버튼 이름이 같으므로 범위를 좁혀야 한다.

- [ ] **Step 3: 실패 확인**

Run: `npm run test -- PostDetailPage`
Expected: FAIL

- [ ] **Step 4: 구현**

- 삭제 핸들러 둘을 열기/실행으로 쪼갠다. `BoardPage`와 같은 패턴이다:

```tsx
const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>({ kind: 'none' });
const [commentError, setCommentError] = useState('');

const closeDelete = () => setDeleteTarget({ kind: 'none' });

const submitDelete = async () => {
    if (deleteTarget.kind === 'post') {
        try {
            await api.delete(`/posts/${postId}`);
            toast.success('게시글을 삭제했습니다.');
            closeDelete();
            navigate('/boards');
        } catch (error) {
            toast.error(errorMessage(error, '게시글 삭제에 실패했습니다.'));
        }
        return;
    }

    if (deleteTarget.kind === 'comment') {
        try {
            await api.delete(`/comments/${deleteTarget.commentId}`);
            toast.success('댓글을 삭제했습니다.');
            closeDelete();
            fetchPost();
        } catch (error) {
            toast.error(errorMessage(error, '댓글 삭제에 실패했습니다.'));
        }
    }
};
```

- 댓글 검증을 인라인으로 바꾼다:

```tsx
const handleCommentSubmit = async () => {
    if (!commentContent.trim()) {
        setCommentError('댓글 내용을 입력해주세요.');
        return;
    }
    setCommentError('');
    // ... 기존 등록 로직, alert는 toast로
};
```

댓글 입력을 `Field` + `Textarea`로 감싸고 `aria-describedby`를 연결한다.

- 나머지 `alert`를 `toast.success` / `toast.error`로 바꾼다.
- 최상위 컨테이너를 `<Layout>`으로, 버튼을 `Button`으로, 색을 토큰으로 교체한다.
- 삭제 확인 `Dialog` 하나를 렌더링한다(대상에 따라 제목만 달라진다):

```tsx
<Dialog
    open={deleteTarget.kind !== 'none'}
    title={deleteTarget.kind === 'comment' ? '댓글을 삭제할까요?' : '게시글을 삭제할까요?'}
    description="삭제하면 되돌릴 수 없습니다."
    onClose={closeDelete}
    footer={
        <>
            <Button variant="secondary" onClick={closeDelete}>취소</Button>
            <Button variant="danger" onClick={submitDelete}>삭제</Button>
        </>
    }
/>
```

- `vi.stubGlobal('alert', vi.fn())`을 테스트에서 제거한다.

- [ ] **Step 5: 통과 확인**

Run: `npm run test -- PostDetailPage`
Expected: PASS

- [ ] **Step 6: 전체 검증 후 커밋**

Run: `npm run test && npm run build && npm run lint`

```bash
git add -A
git commit -F - <<'EOF'
refactor: 게시글 상세의 브라우저 팝업 제거

confirm 2곳(게시글·댓글 삭제)을 다이얼로그로, alert 7곳을 토스트로 바꿨다.
댓글 검증만은 토스트가 아니라 입력 아래 인라인 오류로 보낸다 - 어느 칸이
비었는지 알려줘야 쓸모가 있다.

댓글 삭제는 어느 댓글인지 id를 들고 확인 시점까지 가야 해서, 삭제 대상을
판별 유니온으로 두고 다이얼로그 하나를 공유한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 10: LoginPage · SignupPage 인라인 검증

**Files:**
- Modify: `src/pages/LoginPage.tsx`, `src/pages/SignupPage.tsx`
- Create: `src/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `Layout`(T6, `width="narrow"`), `Button`(T2), `Input`·`Field`(T3), `toast`(T4)

**교체 대상 12곳:** 검증 `alert` 8 → 인라인, 실패 `alert` 2 → 토스트, 회원가입 성공 1 → 토스트, **`alert('로그인 성공!')` 1 → 삭제**(화면이 게시판으로 바뀌므로 중복이다).

- [ ] **Step 1: 실패 테스트 작성**

`src/pages/LoginPage.test.tsx` 신규:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

const mockPost = vi.fn();
vi.mock('../api/axios', async () => {
    const actual = await vi.importActual<typeof import('../api/axios')>('../api/axios');
    return {
        ...actual,
        default: { post: (...args: unknown[]) => mockPost(...args) },
    };
});

const renderLogin = () =>
    render(
        <MemoryRouter>
            <LoginPage />
        </MemoryRouter>
    );

beforeEach(() => {
    mockPost.mockReset();
});

afterEach(() => {
    localStorage.clear();
});

describe('LoginPage', () => {
    it('아이디가 짧으면 그 칸 아래에 오류를 보여준다', async () => {
        const user = userEvent.setup();
        renderLogin();

        await user.type(screen.getByLabelText('아이디'), 'ab');
        await user.type(screen.getByLabelText('비밀번호'), 'password123');
        await user.click(screen.getByRole('button', { name: '로그인' }));

        expect(screen.getByLabelText('아이디')).toHaveAccessibleDescription(
            '아이디는 4자 이상 20자 이하여야 합니다.'
        );
        expect(mockPost).not.toHaveBeenCalled();
    });

    it('비밀번호가 짧으면 그 칸 아래에 오류를 보여준다', async () => {
        const user = userEvent.setup();
        renderLogin();

        await user.type(screen.getByLabelText('아이디'), 'rangssu');
        await user.type(screen.getByLabelText('비밀번호'), 'short');
        await user.click(screen.getByRole('button', { name: '로그인' }));

        expect(screen.getByLabelText('비밀번호')).toHaveAccessibleDescription(
            '비밀번호는 8자 이상 20자 이하여야 합니다.'
        );
        expect(mockPost).not.toHaveBeenCalled();
    });

    it('검증을 통과하면 로그인 요청을 보낸다', async () => {
        const user = userEvent.setup();
        mockPost.mockResolvedValue({ data: { accessToken: 't', userId: 1, role: 'USER' } });
        renderLogin();

        await user.type(screen.getByLabelText('아이디'), 'rangssu');
        await user.type(screen.getByLabelText('비밀번호'), 'password123');
        await user.click(screen.getByRole('button', { name: '로그인' }));

        expect(mockPost).toHaveBeenCalledWith('/auth/login', {
            loginId: 'rangssu',
            password: 'password123',
        });
    });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- LoginPage`
Expected: FAIL — 검증이 아직 `alert`라 접근 가능한 설명이 없음

- [ ] **Step 3: LoginPage 구현**

검증 결과를 필드별 오류 객체로 모은다. `required` 속성은 제거한다 — 브라우저 기본 말풍선이 우리 오류와 겹친다.

```tsx
interface LoginErrors {
    loginId?: string;
    password?: string;
}

const validate = (loginId: string, password: string): LoginErrors => {
    const errors: LoginErrors = {};

    if (!loginId.trim()) errors.loginId = '아이디를 입력해주세요.';
    else if (loginId.length < 4 || loginId.length > 20)
        errors.loginId = '아이디는 4자 이상 20자 이하여야 합니다.';

    if (!password.trim()) errors.password = '비밀번호를 입력해주세요.';
    else if (password.length < 8 || password.length > 20)
        errors.password = '비밀번호는 8자 이상 20자 이하여야 합니다.';

    return errors;
};
```

`handleLogin`:

```tsx
const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors = validate(loginId, password);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
        const response = await api.post('/auth/login', { loginId, password });
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('role', response.data.role);
        // 성공 알림을 띄우지 않는다. 화면이 게시판으로 바뀌는 것이 곧 피드백이다.
        navigate('/boards');
    } catch {
        toast.error('아이디 또는 비밀번호를 확인해주세요.');
    }
};
```

마크업은 `Layout width="narrow"` + `Field` + `Input` + `Button`으로 바꾼다:

```tsx
<Field label="아이디" htmlFor="loginId" error={errors.loginId}>
    <Input
        id="loginId"
        value={loginId}
        onChange={(e) => setLoginId(e.target.value)}
        invalid={Boolean(errors.loginId)}
        aria-describedby={errors.loginId ? 'loginId-error' : undefined}
    />
</Field>
```

회원가입 이동 링크는 `Button variant="ghost"`로 바꾼다.

- [ ] **Step 4: SignupPage 구현**

같은 패턴을 적용한다. 검증 4가지(공백, 아이디 길이, 비밀번호 길이, 이메일 형식)를 각 필드 오류로 나눈다. 이메일 형식 오류는 `email` 필드에, 나머지는 해당 필드에 붙인다. 성공은 `toast.success('회원가입이 완료되었습니다. 로그인해주세요.')` 후 `navigate('/login')`, 실패는 `toast.error(errorMessage(...))`.

- [ ] **Step 5: 통과 확인**

Run: `npm run test -- LoginPage`
Expected: PASS (3 tests)

- [ ] **Step 6: 전체 검증 후 커밋**

Run: `npm run test && npm run build && npm run lint`

```bash
git add -A
git commit -F - <<'EOF'
refactor: 로그인·회원가입 검증을 인라인 오류로

검증 실패 8곳이 alert였다. "비밀번호는 8자 이상"을 화면 구석에 띄우면
어느 칸이 틀렸는지 알 수 없고, 알림을 보는 사이 입력칸은 그대로다.
해당 입력 아래에 붙이고 aria-describedby로 연결했다.

'로그인 성공!' 알림은 없앴다. 성공하면 게시판으로 넘어가므로 화면 전환
자체가 피드백이고 알림은 한 번 더 클릭하게 만들 뿐이었다.

input의 required를 뺐다. 브라우저 기본 말풍선이 우리 오류와 겹쳐 뜬다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 11: PostWritePage · PostEditPage · SearchPage

**Files:**
- Modify: `src/pages/PostWritePage.tsx`, `src/pages/PostEditPage.tsx`, `src/pages/SearchPage.tsx`

**Interfaces:**
- Consumes: `Layout`(T6), `Button`(T2), `Input`·`Textarea`·`Field`(T3), `toast`(T4), `PostTable`(T7)

**교체 대상 7곳:** 검증 `alert` 2 → 인라인, 나머지 5 → 토스트. `SearchPage`에는 팝업이 없고 레이아웃·제목만 붙인다.

- [ ] **Step 1: 글쓰기 검증 테스트 작성**

`src/pages/PostWritePage.test.tsx` 신규. `LoginPage.test.tsx`의 axios 모킹 패턴을 그대로 쓴다.

```tsx
it('제목이 비면 제목 칸 아래에 오류를 보여준다', async () => {
    const user = userEvent.setup();
    renderWritePage();

    await user.type(screen.getByLabelText('내용'), '본문입니다');
    await user.click(screen.getByRole('button', { name: '등록' }));

    expect(screen.getByLabelText('제목')).toHaveAccessibleDescription('제목을 입력해주세요.');
    expect(mockPost).not.toHaveBeenCalled();
});

it('내용이 비면 내용 칸 아래에 오류를 보여준다', async () => {
    const user = userEvent.setup();
    renderWritePage();

    await user.type(screen.getByLabelText('제목'), '제목입니다');
    await user.click(screen.getByRole('button', { name: '등록' }));

    expect(screen.getByLabelText('내용')).toHaveAccessibleDescription('내용을 입력해주세요.');
    expect(mockPost).not.toHaveBeenCalled();
});
```

기존 `alert('제목과 내용을 모두 입력해주세요.')` 하나를 **둘로 나눈다.** 어느 칸이 비었는지 알려주는 것이 인라인 오류의 요점이다.

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- PostWritePage`
Expected: FAIL

- [ ] **Step 3: PostWritePage 구현**

```tsx
interface PostErrors {
    title?: string;
    content?: string;
}

const validate = (title: string, content: string): PostErrors => {
    const errors: PostErrors = {};
    if (!title.trim()) errors.title = '제목을 입력해주세요.';
    if (!content.trim()) errors.content = '내용을 입력해주세요.';
    return errors;
};
```

제출 성공은 `toast.success('게시글을 등록했습니다.')`, 실패는 `toast.error(errorMessage(error, '글 작성에 실패했습니다.'))`. 마크업을 `Layout` + `Field` + `Input`/`Textarea` + `Button`으로 교체한다.

- [ ] **Step 4: PostEditPage 구현**

같은 검증 패턴. 추가로 로드 실패 `alert('데이터를 불러올 수 없습니다.')`를 `toast.error`로 바꾸고, 수정 성공은 `toast.success('게시글을 수정했습니다.')`로 바꾼다.

- [ ] **Step 5: SearchPage 구현**

팝업은 없다. `<Layout>`으로 감싸고 `<h1 className="mb-6 text-xl font-semibold text-fg">` 검색 결과 제목을 추가한다(현재 제목이 아예 없다). 결과 목록은 `PostTable`을 그대로 쓴다.

- [ ] **Step 6: 통과 확인**

Run: `npm run test -- PostWritePage` → PASS
Run: `npm run test -- SearchPage` → PASS (기존 테스트)

- [ ] **Step 7: 전체 검증 후 커밋**

Run: `npm run test && npm run build && npm run lint`

```bash
git add -A
git commit -F - <<'EOF'
refactor: 글 작성·수정·검색 화면 리디자인

'제목과 내용을 모두 입력해주세요' 하나로 뭉뚱그리던 검증을 칸별로 나눴다.
어느 칸이 비었는지 알려주는 것이 인라인 오류의 요점이다.

검색 결과 화면에는 제목이 아예 없었다. 헤더도 없어 어디에 있는지조차
알기 어려웠는데, Layout으로 감싸면서 함께 해결됐다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 12: useLike · axios 인터셉터와 최종 점검

**Files:**
- Modify: `src/hooks/useLike.ts`, `src/api/axios.ts`, `src/components/LikeButton.test.tsx`

**Interfaces:**
- Consumes: `toast`(T4)

**교체 대상 3곳:** `useLike` 2, `axios.ts` 1. **`axios.ts`가 이 계획 전체에서 모듈 레벨 토스트가 꼭 필요한 유일한 지점이다.**

- [ ] **Step 1: 인터셉터 토스트 테스트 작성**

`src/api/axios.test.ts` 신규:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { toast, resetToasts, subscribe } from '../components/ui/toastStore';

describe('세션 만료 알림', () => {
    beforeEach(() => resetToasts());

    it('React 밖에서도 토스트 큐에 쌓인다', () => {
        const seen = vi.fn();
        const unsubscribe = subscribe(seen);

        // axios 인터셉터의 logoutLocally가 하는 것과 같은 호출이다.
        toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');

        expect(seen).toHaveBeenLastCalledWith([
            expect.objectContaining({
                kind: 'error',
                message: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
            }),
        ]);
        unsubscribe();
    });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- axios`
Expected: PASS (스토어는 Task 4에서 이미 만들었다). 이 테스트는 회귀 방지용이며, 실패한다면 Task 4가 깨진 것이므로 먼저 그쪽을 고친다.

- [ ] **Step 3: axios.ts 수정**

`logoutLocally`의 `alert`를 모듈 토스트로 바꾼다.

```ts
import { toast } from '../components/ui/toastStore';

// ...

const logoutLocally = () => {
    console.warn('인증이 만료되었습니다. 로그아웃 처리합니다.');

    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');

    // 이미 로그인 화면이라면 다시 보내지 않습니다 (로그인 실패 시 무한 알림 방지)
    if (window.location.pathname !== '/login') {
        /*
         * 여기는 React 트리 밖이라 useToast를 부를 수 없다. 모듈 레벨
         * 토스트가 필요한 이유가 이 한 줄이다.
         */
        toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/login';
    }
};
```

**주의:** `window.location.href` 이동은 페이지를 새로 로드하므로 방금 띄운 토스트가 즉시 사라진다. 이동을 잠깐 미뤄 사용자가 문구를 읽을 수 있게 한다:

```ts
        toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        // 토스트를 읽을 시간을 준 뒤 이동한다. 바로 이동하면 문구가 보이지 않는다.
        setTimeout(() => {
            window.location.href = '/login';
        }, 1200);
```

- [ ] **Step 4: useLike 수정**

```ts
import { toast } from '../components/ui/toastStore';

// toggle 안에서
if (!localStorage.getItem('accessToken')) {
    toast.error('로그인이 필요합니다.');
    navigate('/login');
    return;
}

// catch 안에서
} catch (error) {
    toast.error(errorMessage(error, '좋아요 처리에 실패했습니다.'));
}
```

`LikeButton.test.tsx`의 `vi.stubGlobal('alert', vi.fn())`을 제거한다.

- [ ] **Step 5: 남은 alert가 없는지 확인**

Run: `npx rg "window\.(alert|confirm|prompt)|[^.\w]alert\(" src`
Expected: 결과 없음. 남아 있으면 해당 파일을 처리한다.

- [ ] **Step 6: 전체 검증**

Run: `npm run test`
Expected: 전부 통과

Run: `npm run build`
Expected: 성공

Run: `npm run lint`
Expected: 오류 없음

- [ ] **Step 7: 실제 브라우저 점검**

로컬 백엔드를 띄우고 `posthub-front/.env.local`에 다음이 있는지 확인한다(없으면 만든다. **`.env`는 배포용 주소라 건드리지 않는다**):

```
VITE_API_URL=http://localhost:8080/api
```

`/api`로 끝나야 한다. 리프레시 쿠키가 `Path=/api/auth`라 경로가 어긋나면 쿠키가 실리지 않는다.

Run: `npm run dev`

**`localhost:5173`으로 연다.** dev 서버는 IPv6(`[::1]`)에만 바인딩되므로 `127.0.0.1:5173`은 붙지 않는다.

확인 목록:
- 7개 페이지 × 라이트/다크 — 읽을 수 없는 색 조합이 없는지
- 브라우저 폭을 360px로 줄여 게시글 목록이 메타 한 줄로 접히는지, 가로 스크롤이 없는지
- 게시판 생성·수정·삭제 다이얼로그
- 키보드만으로: 삭제 버튼 → Enter → Tab 순환 → Escape → 포커스가 삭제 버튼으로 복귀
- 다크모드로 두고 새로고침 — 흰 화면이 번쩍이지 않는지

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -F - <<'EOF'
refactor: 마지막 남은 브라우저 팝업 제거

useLike 2곳과 axios 인터셉터 1곳. 인터셉터의 세션 만료 알림이 토스트를
훅이 아니라 모듈 함수로 만들어야 했던 이유다 - React 트리 밖에서 뜬다.

만료 후 로그인 화면으로 보내는 이동을 잠깐 미뤘다. 바로 이동하면 페이지가
새로 로드되면서 방금 띄운 토스트가 읽히기도 전에 사라진다.

이로써 alert/confirm/prompt 42곳이 모두 사라졌다. 부수 효과로 브라우저
자동화가 안정된다 - 팝업이 뜨면 탭이 멈춰서 페이지를 로드할 때마다
오버라이드를 다시 걸어야 했다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## 자체 검토 결과

**설계 문서 커버리지**

| 설계 항목 | 태스크 |
|---|---|
| 디자인 토큰 13종 | T1 |
| 테마 전환 + 깜빡임 방지 | T1 |
| 성공=무채색 규칙 | T4 |
| Button / Input / Textarea / Field | T2, T3 |
| Toast (훅 + 모듈 함수) | T4, T12 |
| Dialog (포커스 트랩 외 6항목) | T5 |
| Layout / Header / ThemeToggle | T6 |
| App.css 삭제 | T1 |
| PostTable 정제 + 모바일 접기 | T7 |
| TITLE_DISPLAY_MAX 제거 | T7 |
| 폼 검증 11곳 → 인라인 | T9(1), T10(8), T11(2) |
| confirm 3곳 → Dialog | T8(1), T9(2) |
| prompt 2곳 → Dialog | T8 |
| 성공·실패 25곳 → Toast | T8~T12 |
| '로그인 성공!' 삭제 | T10 |
| alert 스텁 정리 | T8, T9, T12 |
| 브라우저 점검 | T12 |

빠진 항목 없음.

**타입 일관성**

- `toast.success` / `toast.error`: T4에서 정의, T6·T8~T12에서 동일 이름으로 사용
- `resetToasts` / `subscribe` / `dismissToast`: T4 정의, T4·T12에서 사용
- `Field`의 에러 id 규칙 `${htmlFor}-error`: T3 정의, T10·T11에서 동일하게 사용
- `Dialog` props(`open`/`title`/`description`/`onClose`/`children`/`footer`): T5 정의, T8·T9에서 동일
- `Layout`의 `width` prop: T6 정의, T10에서 `narrow` 사용
- `Button`의 `variant`/`size`: T2 정의, 이후 전부 동일

**주의로 남긴 것**

`Header`의 `isLoggedIn`이 `localStorage`를 직접 읽어 로그인·로그아웃 후 자동 리렌더되지 않는다. 기존 코드도 `window.location.reload()`로 우회하던 문제이고, 고치려면 인증 상태를 컨텍스트로 올려야 해서 디자인 작업 범위를 넘는다. T6 Step 4에 명시해뒀고, 별도 작업으로 다룰 것을 권한다.
