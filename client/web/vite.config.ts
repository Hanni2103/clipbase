import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Web 前端 dev 配置：Vite 跑 5173，/api 代理到后端 3000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
