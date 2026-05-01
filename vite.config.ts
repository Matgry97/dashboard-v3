import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/garmin": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/api/health": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/api/met": {
          target: "https://api.met.no",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/met/, ""),
          headers: {
            "User-Agent": `dashboard-v3/1.0 ${env.CONTACT_EMAIL}`,
          },
        },
      },
    },
    test: {
      setupFiles: ["./src/test-setup.ts"],
    },
  };
})
