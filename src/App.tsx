// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage'; // 👈 추가된 부분
import BoardPage from './pages/BoardPage'; // 👈 새로 만든 페이지 불러오기

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage />} />

                {/* 👇 회원가입 페이지 경로 추가 */}
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/BoardPage" element={<BoardPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;