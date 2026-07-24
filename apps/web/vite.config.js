import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // 开发期把 /api 代理到后端,前端代码里永远只写相对路径
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } },
  },
});
