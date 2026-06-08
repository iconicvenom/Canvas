export type UserRole = "owner" | "editor" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  templateId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: UserRole;
  user?: User;
}

export type ElementType =
  | "sticky"
  | "shape"
  | "drawing"
  | "text"
  | "image"
  | "arrow";

export interface Element {
  id: string;
  boardId: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  rotation: number;
  data: Record<string, unknown>;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  boardId: string;
  userId: string;
  parentId?: string | null;
  x: number;
  y: number;
  text: string;
  resolved: boolean;
  createdAt: string;
  user?: User;
  replies?: Comment[];
}

export interface Frame {
  id: string;
  boardId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
}

export interface BoardWithDetails extends Board {
  members: BoardMember[];
  elements: Element[];
  comments: Comment[];
  frames: Frame[];
}

export type TemplateId =
  | "blank"
  | "brainstorm"
  | "kanban"
  | "mindmap"
  | "roadmap";

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface CreateBoardInput {
  name: string;
  description?: string;
  templateId?: TemplateId;
}

export interface CreateElementInput {
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  data: Record<string, unknown>;
  zIndex?: number;
}

export interface UpdateElementInput {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  data?: Record<string, unknown>;
  zIndex?: number;
}

export const STICKY_COLORS = [
  "#93f4be",
  "#ffe978",
  "#f28cbd",
  "#ffbd91",
  "#9fe5ff",
  "#0b7cff",
  "#000000",
  "#ffffff",
] as const;

export const DESIGN = {
  bg: "#fdfcf9",
  primary: "#0b7cff",
  stickyGreen: "#93f4be",
  stickyYellow: "#ffe978",
  stickyPink: "#f28cbd",
  stickyOrange: "#ffbd91",
  stickyBlue: "#9fe5ff",
} as const;
