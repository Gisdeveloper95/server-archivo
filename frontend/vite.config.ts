import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Read port from environment or use default
const VITE_PORT = parseInt(process.env.VITE_DEV_PORT || '4545', 10);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Escucha en todas las direcciones de red
    port: VITE_PORT,
    strictPort: true,
    allowedHosts: ['5000-218628.dcigac.local', 'localhost', '127.0.0.1', '.dcigac.local', 'gestionarchivo.duckdns.org', '.duckdns.org', 'server_archivo_frontend', 'frontend'],
    hmr: {
      clientPort: VITE_PORT,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: VITE_PORT,
    allowedHosts: ['5000-218628.dcigac.local', 'localhost', '127.0.0.1', '.dcigac.local', 'gestionarchivo.duckdns.org', '.duckdns.org', 'server_archivo_frontend', 'frontend'],
  },
})
