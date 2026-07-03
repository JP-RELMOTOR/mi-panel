import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Ruta relativa para que funcione bajo usuario.github.io/repo/
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: true },
})
