import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget =
    env.API_PROXY_TARGET || env.VITE_PROXY_TARGET || "http://localhost:8000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      host: "0.0.0.0",
      allowedHosts: [
        "repairshop.sunsetcountry.repair",
        "localhost",
        ".sunsetcountry.repair",
      ],
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
      hmr: {
        host: "repairshop.sunsetcountry.repair",
        port: 443,
        protocol: "wss",
        clientPort: 443,
      },
    },
  };
});
