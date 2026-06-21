import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/status': 'http://localhost:5000',
      '/download': 'http://localhost:5000',
      '/upload': 'http://localhost:5000',
      '/activate': 'http://localhost:5000',
    }
  }
})
