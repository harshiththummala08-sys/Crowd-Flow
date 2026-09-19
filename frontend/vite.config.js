import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/Crowd-Flow/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
  },
});
