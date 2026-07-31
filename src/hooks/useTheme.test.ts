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
