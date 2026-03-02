// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage'; // 👈 추가된 부분
import BoardPage from './pages/BoardPage'; // 👈 새로 만든 페이지 불러오기
import PostDetailPage from './pages/PostDetailPage'; // 👈 [추가] 상세 페이지 컴포넌트 불러오기
import PostWritePage from './pages/PostWritePage'; // 👈 [추가] 글쓰기 페이지 불러오기
import PostEditPage from './pages/PostEditPage'; // 👈 [추가] 수정 페이지 컴포넌트 불러오기


function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* 👇 [수정됨] 처음 사이트에 들어왔을 때(/) 다짜고짜 로그인이 아닌 메인 게시판으로 보냅니다. */}
                <Route path="/" element={<Navigate to="/BoardPage" replace />} />
                <Route path="/login" element={<LoginPage />} />

                {/* 👇 회원가입 페이지 경로 추가 */}
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/BoardPage" element={<BoardPage />} />

                {/* 👇 [추가] 게시글 상세 페이지 경로 추가 :postId는 URL에서 동적으로 변하는 파라미터(게시글 번호)를 의미합니다.*/}
                <Route path="/posts/:postId" element={<PostDetailPage />} />
                {/* 👇 [추가] 글쓰기 페이지 경로 등록 어떤 게시판에 글을 쓸지 알아야 하므로 주소에 :boardId 를 포함합니다. */}
                <Route path="/boards/:boardId/write" element={<PostWritePage />} />
                {/* 👇 [추가] 글 수정 페이지 경로 등록 */}
                <Route path="/posts/:postId/edit" element={<PostEditPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;