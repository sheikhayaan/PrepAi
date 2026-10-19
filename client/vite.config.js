import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Keep the heaviest, least-changed libraries in their own long-lived chunks so a
// UI edit does not force returning users to re-download React/Three/Recharts.
// Returning an empty array for a module instead of null lets Rollup keep its
// default placement for app code.
function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('three')) return 'vendor-three';
  if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
  if (id.includes('framer-motion')) return 'vendor-motion';
  if (id.includes('lucide-react')) return 'vendor-icons';
  if (id.includes('react-router')) return 'vendor-router';
  if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
  return 'vendor';
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: { manualChunks },
    },
  },
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
