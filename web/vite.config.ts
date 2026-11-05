import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// HOST et PORT viennent de l'environnement ou du .env à la racine (HOST=0.0.0.0 : UI accessible depuis le réseau local)
const env = loadEnv('development', fileURLToPath(new URL('..', import.meta.url)), ['HOST', 'PORT'])
const host = process.env.HOST ?? env.HOST ?? '127.0.0.1'
const api = `http://127.0.0.1:${process.env.PORT ?? env.PORT ?? 5000}`

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host, port: 5173, proxy: { '/api': { target: api, xfwd: true } } },
  build: { outDir: 'dist', chunkSizeWarningLimit: 700 },
})
