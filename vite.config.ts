
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, cpSync, existsSync } from 'node:fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-assets',
      closeBundle() {
        try {
          // Copy manifest and main icon
          copyFileSync('manifest.json', 'dist/manifest.json');
          copyFileSync('icon.png', 'dist/icon.png');
          
          // Copy Logos folder if it exists
          if (existsSync('logos')) {
            cpSync('logos', 'dist/logos', { recursive: true });
            console.log('✓ Copied logos folder to dist');
          } else {
            console.warn('⚠ "logos" folder not found in root. Icons may be missing.');
          }
          
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
      input: {
        popup: 'index.html',
        background: 'background.ts'
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
});
