import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import type { User } from "@canvas/shared";
import { prisma } from "./prisma.js";

const SALT_ROUNDS = 12;
const ACCESS_EXPIRY = "15m";
const REFRESH_DAYS = 7;

function getSecrets() {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtSecret || !refreshSecret) {
    throw new Error("JWT secrets not configured");
  }
  return { jwtSecret, refreshSecret };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(userId: string): string {
  const { jwtSecret } = getSecrets();
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: ACCESS_EXPIRY });
}

export function verifyAccessToken(token: string): { userId: string } | null {
  try {
    const { jwtSecret } = getSecrets();
    const payload = jwt.verify(token, jwtSecret) as { sub: string };
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export async function createRefreshSession(userId: string): Promise<string> {
  const token = randomBytes(48).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_DAYS);

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  return token;
}

export async function rotateRefreshToken(
  oldToken: string
): Promise<{ accessToken: string; refreshToken: string; userId: string } | null> {
  const session = await prisma.session.findUnique({
    where: { token: oldToken },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  await prisma.session.delete({ where: { id: session.id } });
  const refreshToken = await createRefreshSession(session.userId);
  const accessToken = signAccessToken(session.userId);

  return { accessToken, refreshToken, userId: session.userId };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

export function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  createdAt: Date;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarColor: user.avatarColor,
    createdAt: user.createdAt.toISOString(),
  };
}
