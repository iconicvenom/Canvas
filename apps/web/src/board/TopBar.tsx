import { Presentation, Share2, Maximize2 } from "lucide-react";
import type { OnlineUser } from "@/hooks/useBoardSocket";

interface Props {
  boardName: string;
  zoom: number;
  onlineUsers: OnlineUser[];
  onNameChange: (name: string) => void;
  onPresent: () => void;
  onInvite: () => void;
  onFit: () => void;
}

export function TopBar({
  boardName,
  zoom,
  onlineUsers,
  onNameChange,
  onPresent,
  onInvite,
  onFit,
}: Props) {
  return (
    <header className="flex items-center justify-between border-b-2 border-black/10 bg-white px-4 py-2">
      <div className="flex items-center gap-4">
        <a href="/dashboard" className="font-chewy text-2xl">
          Canvas
        </a>
        <input
          type="text"
          value={boardName}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={(e) => onNameChange(e.target.value.trim() || boardName)}
          className="rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl hover:border-black/20 focus:border-canvas-primary focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {onlineUsers.map((u) => (
            <span
              key={u.userId}
              title={u.name}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs text-white"
              style={{ backgroundColor: u.avatarColor, borderColor: u.avatarColor }}
            >
              {u.name[0]}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={onPresent}
          className="hidden items-center gap-1 rounded-lg border-2 border-black px-3 py-1.5 text-lg hover:bg-black/5 sm:flex"
        >
          <Presentation className="h-4 w-4" /> Present
        </button>

        <button
          type="button"
          onClick={onInvite}
          className="btn-primary flex items-center gap-1 px-4 py-1.5 text-lg"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-lg">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={onFit} className="rounded-lg p-1 hover:bg-black/5">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
