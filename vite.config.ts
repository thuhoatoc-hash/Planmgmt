
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load các biến môi trường
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    // Cấu hình base path: 
    // - Để chạy được trên Android/iOS (Capacitor), cần dùng đường dẫn tương đối './'
    // - Nếu deploy Vercel, nó vẫn hoạt động tốt.
    base: './',
    build: {
      outDir: 'dist',
    }
  }
})
