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
