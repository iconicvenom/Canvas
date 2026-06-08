import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/auth.js";
import { param } from "../lib/params.js";
import { prisma } from "../lib/prisma.js";

export interface AuthRequest extends Request {
  userId?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", code: "NO_TOKEN" });
    return;
  }

  const token = header.slice(7);
  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token", code: "INVALID_TOKEN" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    res.status(401).json({ error: "User not found", code: "USER_NOT_FOUND" });
    return;
  }

  req.userId = payload.userId;
  next();
}

export async function requireBoardAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  minRole: "viewer" | "editor" | "owner" = "viewer"
): Promise<void> {
  const boardId = param(req, "id");
  const userId = req.userId!;

  const member = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });

  if (!member) {
    res.status(403).json({ error: "Access denied", code: "FORBIDDEN" });
    return;
  }

  const roleRank = { viewer: 0, editor: 1, owner: 2 };
  if (roleRank[member.role as keyof typeof roleRank] < roleRank[minRole]) {
    res.status(403).json({ error: "Insufficient permissions", code: "FORBIDDEN" });
    return;
  }

  next();
}
