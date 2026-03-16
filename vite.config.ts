import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@content": path.resolve(__dirname, "./content"),
    },
  },
  server: {
    proxy: {
      // Proxy API calls to the local Cloudflare Worker during development.
      // Run `npm run worker:dev` in a separate terminal on port 8787.
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
