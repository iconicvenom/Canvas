import type { RemoteCursor } from "@/hooks/useBoardSocket";
import type { Viewport } from "./types";

interface Props {
  cursors: Map<string, RemoteCursor>;
  viewport: Viewport;
}

export function RemoteCursors({ cursors, viewport }: Props) {
  return (
    <>
      {Array.from(cursors.values()).map((cursor) => {
        const screenX = cursor.x * viewport.scale + viewport.x;
        const screenY = cursor.y * viewport.scale + viewport.y;
        return (
          <div
            key={cursor.userId}
            className="pointer-events-none absolute z-30"
            style={{
              left: screenX,
              top: screenY,
              transform: "translate(-4px, -4px)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M5 3L21 16L13 18L10 25L5 3Z"
                fill={cursor.avatarColor}
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="absolute left-6 top-4 whitespace-nowrap rounded px-2 py-0.5 text-sm text-black"
              style={{ backgroundColor: cursor.avatarColor }}
            >
              {cursor.name}
            </span>
          </div>
        );
      })}
    </>
  );
}
