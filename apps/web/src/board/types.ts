export type Tool =
  | "select"
  | "pan"
  | "sticky"
  | "pen"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "text"
  | "eraser"
  | "frame"
  | "comment";

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export const TOOL_SHORTCUTS: Record<string, Tool> = {
  v: "select",
  h: "pan",
  s: "sticky",
  p: "pen",
  r: "rectangle",
  c: "circle",
  l: "line",
  a: "arrow",
  t: "text",
  e: "eraser",
  f: "frame",
  m: "comment",
};
