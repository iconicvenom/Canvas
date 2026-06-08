import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Frame } from "@canvas/shared";
import type { Viewport } from "./types";

interface Props {
  frames: Frame[];
  viewport: Viewport;
  onViewportChange: (v: Partial<Viewport>) => void;
  onClose: () => void;
}

export function PresentationMode({
  frames,
  viewport,
  onViewportChange,
  onClose,
}: Props) {
  const [index, setIndex] = useState(0);
  const sorted = [...frames].sort((a, b) => a.order - b.order);

  useEffect(() => {
    const frame = sorted[index];
    if (!frame) return;

    const container = document.getElementById("board-container");
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const padding = 40;
    const scaleX = (cw - padding * 2) / frame.width;
    const scaleY = (ch - padding * 2) / frame.height;
    const scale = Math.min(scaleX, scaleY, 2);

    onViewportChange({
      scale,
      x: cw / 2 - (frame.x + frame.width / 2) * scale,
      y: ch / 2 - (frame.y + frame.height / 2) * scale,
    });
  }, [index, sorted, onViewportChange]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, sorted.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sorted.length]);

  if (sorted.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="card-surface p-8 text-center">
          <p className="mb-4 text-2xl">No frames to present</p>
          <p className="mb-4 text-lg">Create frames with the Frame tool first.</p>
          <button type="button" onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 shadow-card">
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-black/5">
          <X className="h-5 w-5" />
        </button>
        <span className="text-lg">
          {sorted[index]?.name} ({index + 1}/{sorted.length})
        </span>
      </div>

      <div className="pointer-events-auto absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-4">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
          className="rounded-full border-2 border-black bg-white p-3 shadow-card disabled:opacity-40"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          disabled={index >= sorted.length - 1}
          onClick={() => setIndex((i) => i + 1)}
          className="rounded-full border-2 border-black bg-white p-3 shadow-card disabled:opacity-40"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <aside className="pointer-events-auto absolute right-4 top-1/2 max-h-[60vh] w-48 -translate-y-1/2 overflow-y-auto rounded-xl border-2 border-black bg-white p-3 shadow-card">
        <p className="mb-2 font-medium">Frames</p>
        {sorted.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setIndex(i)}
            className={`mb-2 w-full rounded-lg border-2 p-2 text-left text-sm ${
              i === index ? "border-canvas-primary bg-canvas-primary/10" : "border-black/20"
            }`}
          >
            {f.name}
          </button>
        ))}
      </aside>
    </div>
  );
}
