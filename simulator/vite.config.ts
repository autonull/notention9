import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/ui',
  publicDir: 'public', // relative to root
  build: {
    outDir: '../../dist/ui', // relative to root
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/ui'),
      '@notention/ui': path.resolve(__dirname, '../ui/src'),
      '@notention/core': path.resolve(__dirname, '../core/src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:4444',
        ws: true,
      },
      '/movies': 'http://localhost:3000'
    },
  },
});
