import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import boardRoutes from "./routes/boards.js";
import { setupSocket } from "./socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getClientOrigin(): string {
  if (process.env.CLIENT_ORIGIN) return process.env.CLIENT_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:5173";
}

export function createCanvasServer(): Server {
  const clientOrigin = getClientOrigin();
  const isServerless = Boolean(process.env.VERCEL);

  const storage = isServerless
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (_req, _file, cb) =>
          cb(null, path.join(__dirname, "../uploads")),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          cb(null, `${unique}${path.extname(file.originalname)}`);
        },
      });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      cb(null, allowed.includes(file.mimetype));
    },
  });

  const app = express();
  const httpServer = createServer(app);

  app.use(
    cors({
      origin: clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  if (!isServerless) {
    app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/boards", boardRoutes);

  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    if (isServerless && req.file.buffer) {
      const mime = req.file.mimetype;
      const b64 = req.file.buffer.toString("base64");
      res.json({ url: `data:${mime};base64,${b64}` });
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  setupSocket(httpServer, clientOrigin);

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("Unhandled error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  );

  return httpServer;
}
