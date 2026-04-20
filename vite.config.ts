import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: [
      '6ae2-1-47-23-16.ngrok-free.app',
    ],
    host: true
  },
  plugins: [react(), tailwindcss(),],
})
