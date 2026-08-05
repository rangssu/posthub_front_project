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
