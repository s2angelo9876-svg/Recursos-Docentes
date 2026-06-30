import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        proxyTimeout: 10000,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (err.code === 'ECONNREFUSED') {
              // Servidor aún arrancando — responder 503 limpio en vez de crash
              if (res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Servidor iniciando, reintenta en unos segundos.' }));
              }
            }
          });
        },
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        proxyTimeout: 10000,
        configure: (proxy) => {
          proxy.on('error', () => {}); // silenciar errores de arranque
        },
      }
    }
  }
})

