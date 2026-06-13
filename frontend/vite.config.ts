import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/students': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/attendance': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/update-students': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/change-password': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})