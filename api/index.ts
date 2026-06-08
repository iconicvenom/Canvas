import type { IncomingMessage, ServerResponse } from "http";
import type { VercelRequest, VercelResponse } from "@vercel/node";

declare global {
  // eslint-disable-next-line no-var
  var canvasHttpServer: import("http").Server | undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!global.canvasHttpServer) {
    const { createCanvasServer } = await import("../apps/server/dist/createApp.js");
    global.canvasHttpServer = createCanvasServer();
  }

  global.canvasHttpServer.emit(
    "request",
    req as unknown as IncomingMessage,
    res as unknown as ServerResponse
  );
}
