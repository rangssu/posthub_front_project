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
