import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'converso-widget.js',
        chunkFileNames: 'converso-widget-[hash].js',
        assetFileNames: 'converso-widget.[ext]',
      },
    },
  },
  define: {
    'process.env': {}
  }
})
