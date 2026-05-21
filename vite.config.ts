import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const portFile = '.express-port'
const expressPort = existsSync(portFile)
  ? readFileSync(portFile, 'utf-8').trim()
  : '3001'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: {
              formats: ['cjs'],
              fileName: () => 'main.cjs',
            },
            rollupOptions: {
              external: ['better-sqlite3', 'jsdom', 'canvas'],
            },
          },
        },
      },
      {
        entry: 'preload/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: {
              formats: ['cjs'],
              fileName: () => 'preload.cjs',
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${expressPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      external: ['zod'],
    },
  },
})
