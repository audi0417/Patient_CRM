import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入環境變量
  const env = loadEnv(mode, process.cwd(), '');
  
  // 從環境變量讀取端口配置，使用預設值
  const VITE_PORT = parseInt(env.VITE_PORT || '8080');
  const BACKEND_PORT = parseInt(env.PORT || '3001');
  
  return {
    server: {
      host: "::",
      port: VITE_PORT,
      strictPort: false, // 如果端口被占用，自動嘗試下一個
      proxy: {
        '/api': {
          target: `http://localhost:${BACKEND_PORT}`,
          changeOrigin: true,
          secure: false,
        }
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
  };
});
