import {
  MousePointer2,
  Hand,
  StickyNote,
  Pencil,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Type,
  Eraser,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react";
import { STICKY_COLORS } from "@canvas/shared";
import type { Tool } from "./types";

const TOOLS: { id: Tool; icon: React.ReactNode; shortcut: string }[] = [
  { id: "select", icon: <MousePointer2 className="h-5 w-5" />, shortcut: "V" },
  { id: "pan", icon: <Hand className="h-5 w-5" />, shortcut: "H" },
  { id: "sticky", icon: <StickyNote className="h-5 w-5" />, shortcut: "S" },
  { id: "pen", icon: <Pencil className="h-5 w-5" />, shortcut: "P" },
  { id: "rectangle", icon: <Square className="h-5 w-5" />, shortcut: "R" },
  { id: "circle", icon: <Circle className="h-5 w-5" />, shortcut: "C" },
  { id: "line", icon: <Minus className="h-5 w-5" />, shortcut: "L" },
  { id: "arrow", icon: <ArrowRight className="h-5 w-5" />, shortcut: "A" },
  { id: "text", icon: <Type className="h-5 w-5" />, shortcut: "T" },
  { id: "eraser", icon: <Eraser className="h-5 w-5" />, shortcut: "E" },
  { id: "frame", icon: <LayoutDashboard className="h-5 w-5" />, shortcut: "F" },
  { id: "comment", icon: <MessageSquare className="h-5 w-5" />, shortcut: "M" },
];

interface Props {
  tool: Tool;
  color: string;
  brushSize: number;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  mobile?: boolean;
}

export function Toolbar({
  tool,
  color,
  brushSize,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  mobile,
}: Props) {
  return (
    <div
      className={`${
        mobile
          ? "fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 gap-2 overflow-x-auto rounded-xl border border-black/10 bg-white px-3 py-2 shadow-lg md:hidden"
          : "absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col rounded-xl border border-black/10 bg-white px-3 py-4 shadow-lg md:flex"
      }`}
    >
      <div className={`flex ${mobile ? "flex-row gap-2" : "flex-col gap-3"}`}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={`${t.id} (${t.shortcut})`}
            onClick={() => onToolChange(t.id)}
            className={`rounded-md p-2 transition ${
              tool === t.id ? "bg-canvas-primary text-white" : "hover:bg-black/5"
            }`}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {!mobile && (
        <>
          <div className="my-2 h-px bg-black/10" />
          <div className="flex flex-col gap-2">
            {STICKY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onColorChange(c)}
                className={`h-6 w-6 rounded border-2 ${
                  color === c ? "border-canvas-primary ring-2 ring-canvas-primary" : "border-black"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {tool === "pen" && (
            <div className="mt-2">
              <label className="text-sm">Brush</label>
              <input
                type="range"
                min={1}
                max={20}
                value={brushSize}
                onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
