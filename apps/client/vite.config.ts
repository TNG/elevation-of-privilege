/// <reference types="vitest" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const SERVER_PORT = Number.parseInt(process.env.SERVER_PORT ?? '8000');
const API_PORT = Number.parseInt(process.env.API_PORT ?? '8001');

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: `ws://localhost:${SERVER_PORT}`,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: { freeze: false },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
});
