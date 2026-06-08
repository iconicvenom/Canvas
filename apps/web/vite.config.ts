import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

function landingAtRoot(): Plugin {
  const rewrite = (
    req: { url?: string },
    _res: unknown,
    next: () => void
  ) => {
    const pathname = req.url?.split("?")[0] ?? "";
    if (pathname === "/" || pathname === "/index.html") {
      const qs = req.url?.includes("?") ? "?" + req.url.split("?")[1] : "";
      req.url = "/canvas-landing.html" + qs;
    }
    next();
  };

  return {
    name: "landing-at-root",
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig({
  plugins: [landingAtRoot(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
      },
    },
  },
});
