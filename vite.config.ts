import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // The application persists runtime state inside the project directory while
      // running in JSON mode. Any Vite watcher can interpret those writes as source
      // changes and force a full page reload. The official local workflow favors
      // stability over HMR, so file watching is disabled completely.
      hmr: false,
      watch: null,
    },
  };
});
