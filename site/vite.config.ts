import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const guidePort = env.GUIDE_API_PORT?.trim() || '8787'
  const guideTarget = env.VITE_GUIDE_PROXY_TARGET?.trim() || `http://127.0.0.1:${guidePort}`

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/guide': {
          target: guideTarget,
          changeOrigin: true,
        },
        '/api/guide/health': {
          target: guideTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
