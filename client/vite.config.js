import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Prefer VITE_PORT, otherwise let Vite pick the next free port.
    // Never hard-fail just because a preview/auto-PR server holds a port.
    port: Number(process.env.VITE_PORT) || 5200,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
