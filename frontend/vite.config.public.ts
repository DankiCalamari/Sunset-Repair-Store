import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.PUBLIC_API_PROXY_TARGET || env.VITE_PROXY_TARGET || "http://localhost:8000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src/public-site"),
      },
    },
    root: path.resolve(__dirname, "public-site"),
    server: {
      port: 3001,
      host: "0.0.0.0",
      strictPort: true,
      allowedHosts: [
        "repairshop.sunsetcountry.repair",
        "localhost",
        "127.0.0.1",
      ],
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist-public",
    },
  };
});
