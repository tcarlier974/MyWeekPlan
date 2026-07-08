import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Analytics } from "@vercel/analytics/next"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
