import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/strava": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/api/health": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/api/weather": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/api/news": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
    test: {
      setupFiles: ["./src/test-setup.ts"],
      // Playwright specs are run by `npx playwright test`, not Vitest
      exclude: ["**/node_modules/**", "e2e/**"],
    },
  };
})
