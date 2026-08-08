import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          router: ["wouter"],
          query: ["@tanstack/react-query"],
          charts: ["recharts"],
          motion: ["framer-motion"],
        },
      },
    },
  },
  server: {
    port: Number(process.env.PORT ?? 3000),
    strictPort: false,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port: Number(process.env.PORT ?? 4173),
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
