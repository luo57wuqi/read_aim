import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This correctly injects the env vars into process.env for the Google SDK
      'process.env': JSON.stringify(env)
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
  };
});