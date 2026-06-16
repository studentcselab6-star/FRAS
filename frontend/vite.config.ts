import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://fras-7xws.onrender.com/',
        changeOrigin: true,
      },
      '/auth': {
        target: 'https://fras-7xws.onrender.com/',
        changeOrigin: true,
      },
      '/attendance': {
        target: 'https://fras-7xws.onrender.com/',
        changeOrigin: true,
      },
      '/update-students': {
        target: 'https://fras-7xws.onrender.com/',
        changeOrigin: true,
      },
      '/change-password': {
        target: 'https://fras-7xws.onrender.com/',
        changeOrigin: true,
      },
    },
  },
})