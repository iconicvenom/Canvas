import { Router } from "express";
import type { Response } from "express";
import {
  createRefreshSession,
  hashPassword,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
  toPublicUser,
  verifyPassword,
} from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const REFRESH_COOKIE = "refreshToken";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

router.post("/register", async (req, res: Response) => {
  const { email, name, password } = req.body as {
    email?: string;
    name?: string;
    password?: string;
  };

  if (!email || !name || !password) {
    res.status(400).json({ error: "Email, name, and password required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered", code: "EMAIL_EXISTS" });
    return;
  }

  const colors = ["#0b7cff", "#93f4be", "#f28cbd", "#ffbd91", "#ffe978"];
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    },
  });

  const accessToken = signAccessToken(user.id);
  const refreshToken = await createRefreshSession(user.id);
  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
  res.status(201).json({ accessToken, user: toPublicUser(user) });
});

router.post("/login", async (req, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    return;
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = await createRefreshSession(user.id);
  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
  res.json({ accessToken, user: toPublicUser(user) });
});

router.post("/logout", async (req, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    await revokeRefreshToken(token);
  }
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.post("/refresh", async (req, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "No refresh token", code: "NO_REFRESH" });
    return;
  }

  const result = await rotateRefreshToken(token);
  if (!result) {
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    res.status(401).json({ error: "Invalid refresh token", code: "INVALID_REFRESH" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: result.userId } });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
  res.json({ accessToken: result.accessToken, user: toPublicUser(user) });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: toPublicUser(user) });
});

export default router;
