import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api and /health to the Node gateway so the browser has no CORS issues.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:5000",
      "/health": "http://localhost:5000",
    },
  },
});
