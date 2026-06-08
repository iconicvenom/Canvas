import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { Element, Comment } from "@canvas/shared";
import { verifyAccessToken } from "./lib/auth.js";
import { prisma } from "./lib/prisma.js";

interface OnlineUser {
  userId: string;
  name: string;
  avatarColor: string;
  socketId: string;
}

const boardUsers = new Map<string, Map<string, OnlineUser>>();

export function setupSocket(httpServer: HttpServer, clientOrigin: string) {
  const io = new Server(httpServer, {
    cors: { origin: clientOrigin, credentials: true },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("Authentication required"));
      return;
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      next(new Error("Invalid token"));
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      next(new Error("User not found"));
      return;
    }

    socket.data.userId = user.id;
    socket.data.name = user.name;
    socket.data.avatarColor = user.avatarColor;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const name = socket.data.name as string;
    const avatarColor = socket.data.avatarColor as string;

    socket.on("join-board", async ({ boardId }: { boardId: string }) => {
      const member = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId } },
      });
      if (!member) return;

      socket.join(`board:${boardId}`);

      if (!boardUsers.has(boardId)) {
        boardUsers.set(boardId, new Map());
      }
      const users = boardUsers.get(boardId)!;
      users.set(userId, { userId, name, avatarColor, socketId: socket.id });

      const online = Array.from(users.values()).map((u) => ({
        userId: u.userId,
        name: u.name,
        avatarColor: u.avatarColor,
      }));

      socket.emit("online-users", online);
      socket.to(`board:${boardId}`).emit("user-joined", { userId, name, avatarColor });
    });

    socket.on("leave-board", ({ boardId }: { boardId: string }) => {
      socket.leave(`board:${boardId}`);
      const users = boardUsers.get(boardId);
      if (users) {
        users.delete(userId);
        if (users.size === 0) boardUsers.delete(boardId);
      }
      socket.to(`board:${boardId}`).emit("user-left", { userId });
    });

    socket.on(
      "cursor-move",
      ({ boardId, x, y }: { boardId: string; x: number; y: number }) => {
        socket.to(`board:${boardId}`).emit("cursor-update", {
          userId,
          name,
          avatarColor,
          x,
          y,
        });
      }
    );

    // REST API persists mutations — sockets only propagate to other clients
    socket.on(
      "element-add",
      async ({ boardId, element }: { boardId: string; element: Element }) => {
        const member = await prisma.boardMember.findUnique({
          where: { boardId_userId: { boardId, userId } },
        });
        if (!member || member.role === "viewer" || !element?.id) return;

        socket.to(`board:${boardId}`).emit("element-added", { element });
      }
    );

    socket.on(
      "element-update",
      async ({
        boardId,
        elementId,
        patch,
      }: {
        boardId: string;
        elementId: string;
        patch: Record<string, unknown>;
      }) => {
        const member = await prisma.boardMember.findUnique({
          where: { boardId_userId: { boardId, userId } },
        });
        if (!member || member.role === "viewer") return;

        socket.to(`board:${boardId}`).emit("element-updated", { elementId, patch });
      }
    );

    socket.on(
      "element-delete",
      async ({ boardId, elementId }: { boardId: string; elementId: string }) => {
        const member = await prisma.boardMember.findUnique({
          where: { boardId_userId: { boardId, userId } },
        });
        if (!member || member.role === "viewer") return;

        socket.to(`board:${boardId}`).emit("element-deleted", { elementId });
      }
    );

    socket.on(
      "comment-add",
      async ({ boardId, comment }: { boardId: string; comment: Comment }) => {
        const member = await prisma.boardMember.findUnique({
          where: { boardId_userId: { boardId, userId } },
        });
        if (!member || member.role === "viewer" || !comment?.id) return;

        socket.to(`board:${boardId}`).emit("comment-added", { comment });
      }
    );

    socket.on("disconnect", () => {
      for (const [boardId, users] of boardUsers.entries()) {
        if (users.has(userId)) {
          users.delete(userId);
          io.to(`board:${boardId}`).emit("user-left", { userId });
          if (users.size === 0) boardUsers.delete(boardId);
        }
      }
    });
  });

  return io;
}
