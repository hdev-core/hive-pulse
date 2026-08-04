
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, cpSync, existsSync } from 'node:fs';

// Build target is selected via `--mode firefox`. Chrome is the default.
//   npm run build           → dist/         (Chrome, manifest.json)
//   npm run build:firefox   → dist-firefox/ (Firefox, manifest.firefox.json)
export default defineConfig(({ mode }) => {
  const isFirefox   = mode === 'firefox';
  const outDir      = isFirefox ? 'dist-firefox' : 'dist';
  const manifestSrc = isFirefox ? 'manifest.firefox.json' : 'manifest.json';

  return {
    plugins: [
      react(),
      {
        name: 'copy-assets',
        closeBundle() {
          try {
            // Copy the target-specific manifest as manifest.json
            copyFileSync(manifestSrc, `${outDir}/manifest.json`);
            if (existsSync('icon.svg')) copyFileSync('icon.svg', `${outDir}/icon.svg`);
            if (existsSync('icon.png')) copyFileSync('icon.png', `${outDir}/icon.png`);

            if (existsSync('logos')) {
              cpSync('logos', `${outDir}/logos`, { recursive: true });
              console.log(`✓ Copied logos folder to ${outDir}`);
            } else {
              console.warn('⚠ "logos" folder not found in root. Icons may be missing.');
            }

            console.log(`✓ Copied ${manifestSrc} → ${outDir}/manifest.json`);
          } catch (e) {
            console.error('Failed to copy assets:', e);
          }
        }
      }
    ],
    build: {
      outDir,
      emptyOutDir: true,
      // Vite injects <link rel="modulepreload" crossorigin> into index.html, which browsers
      // reject inside an extension page ("cross-world extension resource mismatch") and can
      // leave the popup's shared chunk failing to load. Extension pages load from local
      // disk, so preloading buys nothing here.
      modulePreload: false,
      rollupOptions: {
        input: {
          popup: 'index.html',
          background: 'background.ts',
          content: 'content.ts',
          compose: 'compose.ts',
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]'
        }
      }
    },
  };
});
