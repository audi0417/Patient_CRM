import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: '.',
  base: './', // 確保相對路徑，讓靜態部署能運作
  build: {
    outDir: 'demo-experience',
    emptyOutDir: true, // 清空目錄
    rollupOptions: {
      input: 'index-demo.html'
    }
  },
  plugins: [
    react()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      crypto: "crypto-browserify",
      stream: "stream-browserify",
      util: "util",
      events: "events",
      buffer: "buffer",
    },
  },
  define: {
    "process.env": {},
    "process.browser": true,
    global: "globalThis",
    Buffer: ["buffer", "Buffer"],
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
}));
