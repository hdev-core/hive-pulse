import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-assets',
      closeBundle() {
        try {
          copyFileSync('manifest.json', 'dist/manifest.json');
          copyFileSync('icon.svg', 'dist/icon.svg');
          console.log('✓ Copied manifest and icon to dist');
        } catch (e) {
          console.error('Failed to copy assets:', e);
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
});