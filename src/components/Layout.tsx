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
