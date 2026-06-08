import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvasServer } from "./createApp.js";

const __serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__serverDir, "../.env") });

const PORT = Number(process.env.PORT) || 4000;
const httpServer = createCanvasServer();

httpServer.listen(PORT, () => {
  console.log(`Canvas server running on http://localhost:${PORT}`);
});
