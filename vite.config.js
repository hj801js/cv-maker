import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';

export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.js'),
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      },
      renderer: {}
    })
  ],
  build: {
    outDir: 'dist'
  },
  server: {
    port: 5174,
    strictPort: true
  }
});
