import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load các biến môi trường
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    // Cấu hình base path: 
    // - Mặc định là '/' cho Vercel hoặc root domain.
    // - Nếu deploy GitHub Pages, cần set VITE_BASE_PATH=/ten-repo/ trong .env
    base: env.VITE_BASE_PATH || '/',
  }
})