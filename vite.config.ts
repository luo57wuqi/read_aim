import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': JSON.stringify({}) // Polyfill process.env for libs that expect it
  },
  server: {
    port: 5173,
    proxy: {
        '/api': {
            target: 'http://localhost:5000',
            changeOrigin: true
        }
    }
  },
  build: {
    outDir: 'dist'
  }
});
