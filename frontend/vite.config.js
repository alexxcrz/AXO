import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const FRONTEND_PORT = 5173
const BACKEND_PORT = 4000

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../backend/frontend-dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/jspdf-autotable')) return 'jspdf-autotable';
          if (id.includes('node_modules/jspdf')) return 'jspdf';
          if (id.includes('node_modules/exceljs')) return 'exceljs';
          if (id.includes('node_modules/html2canvas')) return 'html2canvas';
          if (id.includes('node_modules/jsbarcode') || id.includes('node_modules/qrcode')) return 'barcode';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: FRONTEND_PORT,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      '/socket.io': {
        target: `ws://127.0.0.1:${BACKEND_PORT}`,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: FRONTEND_PORT,
    strictPort: true,
  },
})
