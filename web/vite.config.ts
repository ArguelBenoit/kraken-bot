/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const api = `http://127.0.0.1:${process.env.PORT ?? 5000}`

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: process.env.HOST ?? '127.0.0.1', port: 5173, proxy: { '/api': api } },
  build: { outDir: 'dist', chunkSizeWarningLimit: 700 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
