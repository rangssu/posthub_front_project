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
