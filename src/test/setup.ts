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
