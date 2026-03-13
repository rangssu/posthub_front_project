// src/main.tsx
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    // 👇 <React.StrictMode> 와 </React.StrictMode> 를 지우고 <App />만 남겨주세요!
    <App />
)