/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // 컴포넌트가 실제로 무엇을 그리는지 봐야 해서 DOM 환경이 필요하다.
    // 백엔드 응답 형식이 바뀌었을 때 화면이 조용히 비는 걸 잡는 게 목적이다.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
