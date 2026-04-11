import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4029,
    proxy: {
      '/api': {
        target: 'http://localhost:4030',
        changeOrigin: true,
      },
    },
  },
});
