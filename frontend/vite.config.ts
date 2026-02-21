import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy target: in Docker, set VITE_PROXY_TARGET=http://backend:8000
// Locally, defaults to http://localhost:8000
const proxyTarget =
    (typeof process !== 'undefined' && process.env?.VITE_PROXY_TARGET) ||
    'http://localhost:8000';

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/api': {
                target: proxyTarget,
                changeOrigin: true,
            },
        },
    },
});
