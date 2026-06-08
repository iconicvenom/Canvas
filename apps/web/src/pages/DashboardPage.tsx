import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MoreVertical, Plus, Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import type { TemplateId } from "@canvas/shared";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { NewBoardModal } from "@/components/NewBoardModal";

interface BoardListItem {
  id: string;
  name: string;
  updatedAt: string;
  members: Array<{ user: { id: string; name: string; avatarColor: string } }>;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const loadBoards = useCallback(async () => {
    try {
      const { data } = await api.get<{ boards: BoardListItem[] }>("/boards");
      setBoards(data.boards);
    } catch (err) {
      const msg = getErrorMessage(err);
      toast.error(msg === "Something went wrong" ? "Failed to load boards — try logging in again" : msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  async function createBoard(name: string, templateId: TemplateId) {
    try {
      const { data } = await api.post<{ board: { id: string } }>("/boards", {
        name,
        templateId,
      });
      toast.success("Board created!");
      navigate(`/board/${data.board.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  }

  async function deleteBoard(id: string) {
    await api.delete(`/boards/${id}`);
    setBoards((b) => b.filter((x) => x.id !== id));
    toast.success("Board deleted");
    setMenuId(null);
  }

  async function renameBoard(id: string) {
    const name = prompt("New board name:");
    if (!name?.trim()) return;
    await api.put(`/boards/${id}`, { name: name.trim() });
    setBoards((b) =>
      b.map((x) => (x.id === id ? { ...x, name: name.trim() } : x))
    );
    toast.success("Board renamed");
    setMenuId(null);
  }

  return (
    <div className="min-h-screen grid-bg">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-b-3xl border-b-2 border-black/10 bg-white/95 px-6 py-5 shadow-lg">
        <a href="/" className="font-chewy text-4xl">
          Canvas
        </a>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Board
          </button>
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border-2 border-black px-3 py-1"
              onClick={() => setMenuId(menuId === "user" ? null : "user")}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-white"
                style={{ backgroundColor: user?.avatarColor }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </span>
              <span className="hidden sm:inline">{user?.name}</span>
            </button>
            {menuId === "user" && (
              <div className="absolute right-0 top-full z-10 mt-2 w-40 rounded-xl border-2 border-black bg-white py-2 shadow-card">
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left hover:bg-black/5"
                  onClick={async () => {
                    await logout();
                    window.location.href = "/";
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-8 font-chewy text-5xl">Your boards</h1>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border-2 border-black/10 bg-white" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <div className="card-surface p-12 text-center">
            <p className="mb-4 text-2xl">No boards yet</p>
            <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
              Create your first board
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <div key={board.id} className="card-surface relative overflow-hidden">
                <Link to={`/board/${board.id}`} className="block p-5">
                  <div className="mb-3 h-24 rounded-lg border border-black/10 grid-bg" />
                  <h3 className="text-2xl font-medium">{board.name}</h3>
                  <p className="text-lg text-black/60">
                    Updated {new Date(board.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex -space-x-2">
                    {board.members.slice(0, 4).map((m) => (
                      <span
                        key={m.user.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs text-white"
                        style={{ backgroundColor: m.user.avatarColor }}
                        title={m.user.name}
                      >
                        {m.user.name[0]}
                      </span>
                    ))}
                  </div>
                </Link>
                <button
                  type="button"
                  className="absolute right-3 top-3 rounded-lg p-1 hover:bg-black/5"
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuId(menuId === board.id ? null : board.id);
                  }}
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {menuId === board.id && (
                  <div className="absolute right-3 top-10 z-10 w-36 rounded-xl border-2 border-black bg-white py-1 shadow-card">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 hover:bg-black/5"
                      onClick={() => renameBoard(board.id)}
                    >
                      <Pencil className="h-4 w-4" /> Rename
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-red-600 hover:bg-black/5"
                      onClick={() => deleteBoard(board.id)}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <NewBoardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={createBoard}
      />
    </div>
  );
}
