import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 테스트마다 DOM을 비운다. 안 그러면 앞 테스트가 남긴 노드가 쿼리에 걸린다.
afterEach(() => {
    cleanup();
});
