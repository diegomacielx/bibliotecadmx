import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('@firebase/auth') || id.includes('firebase/auth')) {
            return 'firebase-auth'
          }
          if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) {
            return 'firebase-firestore'
          }
          if (id.includes('@firebase/') || id.includes('/firebase/')) {
            return 'firebase-core'
          }

          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
          if (id.includes('lucide-react')) return 'icons'
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
