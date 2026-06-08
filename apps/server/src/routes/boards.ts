import { Router } from "express";
import type { Response } from "express";
import type { Prisma } from "@prisma/client";
import type { CreateBoardInput, TemplateId } from "@canvas/shared";
import { param } from "../lib/params.js";
import { prisma } from "../lib/prisma.js";
import { getTemplateElements } from "../lib/templates.js";
import type { AuthRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

function serializeBoard(board: {
  id: string;
  name: string;
  description: string | null;
  templateId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: board.id,
    name: board.name,
    description: board.description,
    templateId: board.templateId,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  };
}

async function checkAccess(
  boardId: string,
  userId: string,
  minRole: "viewer" | "editor" | "owner"
): Promise<boolean> {
  const member = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  if (!member) return false;
  const rank = { viewer: 0, editor: 1, owner: 2 };
  return rank[member.role as keyof typeof rank] >= rank[minRole];
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const memberships = await prisma.boardMember.findMany({
    where: { userId: req.userId! },
    include: {
      board: {
        include: {
          members: { include: { user: true } },
        },
      },
    },
    orderBy: { board: { updatedAt: "desc" } },
  });

  res.json({
    boards: memberships.map((m) => ({
      ...serializeBoard(m.board),
      role: m.role,
      members: m.board.members.map((bm) => ({
        id: bm.id,
        boardId: bm.boardId,
        userId: bm.userId,
        role: bm.role,
        user: {
          id: bm.user.id,
          email: bm.user.email,
          name: bm.user.name,
          avatarColor: bm.user.avatarColor,
          createdAt: bm.user.createdAt.toISOString(),
        },
      })),
    })),
  });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, templateId } = req.body as CreateBoardInput;

    if (!name?.trim()) {
      res.status(400).json({ error: "Board name is required" });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized", code: "NO_USER" });
      return;
    }

    const tid = (templateId ?? "blank") as TemplateId;

    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        description: description ?? null,
        templateId: tid === "blank" ? null : tid,
        members: {
          create: { userId: req.userId, role: "owner" },
        },
      },
    });

    const templateElements = getTemplateElements(tid);
    if (templateElements.length > 0) {
      await prisma.element.createMany({
        data: templateElements.map((el) => ({
          boardId: board.id,
          type: el.type,
          x: el.x,
          y: el.y,
          width: el.width ?? null,
          height: el.height ?? null,
          rotation: el.rotation ?? 0,
          data: el.data as Prisma.InputJsonValue,
          zIndex: el.zIndex ?? 0,
        })),
      });
    }

    res.status(201).json({ board: serializeBoard(board) });
  } catch (err) {
    console.error("Create board failed:", err);
    res.status(500).json({ error: "Failed to create board", code: "BOARD_CREATE_FAILED" });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "viewer"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      members: { include: { user: true } },
      elements: { orderBy: { zIndex: "asc" } },
      comments: {
        where: { parentId: null },
        include: {
          user: true,
          replies: { include: { user: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
      frames: { orderBy: { order: "asc" } },
    },
  });

  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }

  res.json({
    board: {
      ...serializeBoard(board),
      members: board.members.map((m) => ({
        id: m.id,
        boardId: m.boardId,
        userId: m.userId,
        role: m.role,
        user: {
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
          avatarColor: m.user.avatarColor,
          createdAt: m.user.createdAt.toISOString(),
        },
      })),
      elements: board.elements.map(serializeElement),
      comments: board.comments.map(serializeComment),
      frames: board.frames.map(serializeFrame),
    },
  });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "editor"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { name, description } = req.body as { name?: string; description?: string };

  const board = await prisma.board.update({
    where: { id: boardId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description }),
    },
  });

  res.json({ board: serializeBoard(board) });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "owner"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await prisma.board.delete({ where: { id: boardId } });
  res.json({ ok: true });
});

router.post("/:id/invite", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "owner"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { email, role = "editor" } = req.body as { email?: string; role?: string };
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
    return;
  }

  const existing = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });
  if (existing) {
    res.status(409).json({ error: "User is already a member" });
    return;
  }

  const member = await prisma.boardMember.create({
    data: { boardId, userId: user.id, role },
    include: { user: true },
  });

  res.status(201).json({
    member: {
      id: member.id,
      boardId: member.boardId,
      userId: member.userId,
      role: member.role,
      user: {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name,
        avatarColor: member.user.avatarColor,
        createdAt: member.user.createdAt.toISOString(),
      },
    },
  });
});

// Elements
router.get("/:id/elements", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "viewer"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const elements = await prisma.element.findMany({
    where: { boardId },
    orderBy: { zIndex: "asc" },
  });
  res.json({ elements: elements.map(serializeElement) });
});

router.post("/:id/elements", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "editor"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { type, x, y, width, height, rotation, data, zIndex } = req.body;

  const element = await prisma.element.create({
    data: {
      boardId,
      type,
      x,
      y,
      width: width ?? null,
      height: height ?? null,
      rotation: rotation ?? 0,
      data: data ?? {},
      zIndex: zIndex ?? 0,
    },
  });

  await prisma.board.update({
    where: { id: boardId },
    data: { updatedAt: new Date() },
  });

  res.status(201).json({ element: serializeElement(element) });
});

router.put("/:id/elements/:eid", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  const elementId = param(req, "eid");
  if (!(await checkAccess(boardId, req.userId!, "editor"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { x, y, width, height, rotation, data, zIndex } = req.body;
  const element = await prisma.element.update({
    where: { id: elementId },
    data: {
      ...(x !== undefined && { x }),
      ...(y !== undefined && { y }),
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
      ...(rotation !== undefined && { rotation }),
      ...(data !== undefined && { data }),
      ...(zIndex !== undefined && { zIndex }),
    },
  });

  await prisma.board.update({
    where: { id: boardId },
    data: { updatedAt: new Date() },
  });

  res.json({ element: serializeElement(element) });
});

router.delete("/:id/elements/:eid", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "editor"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await prisma.element.delete({ where: { id: param(req, "eid") } });
  await prisma.board.update({
    where: { id: boardId },
    data: { updatedAt: new Date() },
  });
  res.json({ ok: true });
});

// Comments
router.get("/:id/comments", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "viewer"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const comments = await prisma.comment.findMany({
    where: { boardId, parentId: null },
    include: {
      user: true,
      replies: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json({ comments: comments.map(serializeComment) });
});

router.post("/:id/comments", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "editor"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { x, y, text, parentId } = req.body;
  const comment = await prisma.comment.create({
    data: {
      boardId,
      userId: req.userId!,
      x,
      y,
      text,
      parentId: parentId ?? null,
    },
    include: { user: true },
  });

  res.status(201).json({ comment: serializeComment(comment) });
});

router.put("/:id/comments/:cid", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "editor"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { text, resolved } = req.body;
  const comment = await prisma.comment.update({
    where: { id: param(req, "cid") },
    data: {
      ...(text !== undefined && { text }),
      ...(resolved !== undefined && { resolved }),
    },
    include: { user: true, replies: { include: { user: true } } },
  });

  res.json({ comment: serializeComment(comment) });
});

router.delete("/:id/comments/:cid", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "editor"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await prisma.comment.delete({ where: { id: param(req, "cid") } });
  res.json({ ok: true });
});

// Frames
router.get("/:id/frames", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "viewer"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const frames = await prisma.frame.findMany({
    where: { boardId },
    orderBy: { order: "asc" },
  });
  res.json({ frames: frames.map(serializeFrame) });
});

router.post("/:id/frames", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "editor"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { name, x, y, width, height, order } = req.body;
  const frame = await prisma.frame.create({
    data: { boardId, name, x, y, width, height, order },
  });
  res.status(201).json({ frame: serializeFrame(frame) });
});

router.put("/:id/frames/:fid", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "editor"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { name, x, y, width, height, order } = req.body;
  const frame = await prisma.frame.update({
    where: { id: param(req, "fid") },
    data: {
      ...(name !== undefined && { name }),
      ...(x !== undefined && { x }),
      ...(y !== undefined && { y }),
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
      ...(order !== undefined && { order }),
    },
  });
  res.json({ frame: serializeFrame(frame) });
});

router.delete("/:id/frames/:fid", async (req: AuthRequest, res: Response) => {
  const boardId = param(req, "id");
  if (!(await checkAccess(boardId, req.userId!, "editor"))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await prisma.frame.delete({ where: { id: param(req, "fid") } });
  res.json({ ok: true });
});

function serializeElement(el: {
  id: string;
  boardId: string;
  type: string;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  rotation: number;
  data: unknown;
  zIndex: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: el.id,
    boardId: el.boardId,
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    data: el.data as Record<string, unknown>,
    zIndex: el.zIndex,
    createdAt: el.createdAt.toISOString(),
    updatedAt: el.updatedAt.toISOString(),
  };
}

type CommentRow = {
  id: string;
  boardId: string;
  userId: string;
  parentId: string | null;
  x: number;
  y: number;
  text: string;
  resolved: boolean;
  createdAt: Date;
  user?: { id: string; email: string; name: string; avatarColor: string; createdAt: Date };
  replies?: CommentRow[];
};

function serializeComment(c: CommentRow): Record<string, unknown> {
  return {
    id: c.id,
    boardId: c.boardId,
    userId: c.userId,
    parentId: c.parentId,
    x: c.x,
    y: c.y,
    text: c.text,
    resolved: c.resolved,
    createdAt: c.createdAt.toISOString(),
    user: c.user
      ? {
          id: c.user.id,
          email: c.user.email,
          name: c.user.name,
          avatarColor: c.user.avatarColor,
          createdAt: c.user.createdAt.toISOString(),
        }
      : undefined,
    replies: c.replies?.map((r) => serializeComment({ ...r, replies: undefined })),
  };
}

function serializeFrame(f: {
  id: string;
  boardId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
}) {
  return {
    id: f.id,
    boardId: f.boardId,
    name: f.name,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    order: f.order,
  };
}

export default router;
