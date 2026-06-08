import { useCallback, useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import type { Element, Comment, Frame, BoardWithDetails } from "@canvas/shared";
import { api, getErrorMessage } from "@/lib/api";
import { useHistory } from "@/hooks/useHistory";
import { useBoardSocket } from "@/hooks/useBoardSocket";
import { TopBar } from "@/board/TopBar";
import { Toolbar } from "@/board/Toolbar";
import { CanvasStage } from "@/board/CanvasStage";
import { RightPanel } from "@/board/RightPanel";
import { RemoteCursors } from "@/board/RemoteCursors";
import { PresentationMode } from "@/board/PresentationMode";
import { TOOL_SHORTCUTS, type Tool, type Viewport } from "@/board/types";

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<BoardWithDetails | null>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#ffe978");
  const [brushSize, setBrushSize] = useState(3);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [presenting, setPresenting] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const history = useHistory();
  const boardNameRef = useRef("");

  const loadBoard = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get<{ board: BoardWithDetails }>(`/boards/${id}`);
      setBoard(data.board);
      setElements(data.board.elements);
      setComments(data.board.comments);
      setFrames(data.board.frames);
      boardNameRef.current = data.board.name;
    } catch {
      toast.error("Failed to load board");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const socketHandlers = useRef({
    onElementAdded: (el: Element) => {
      setElements((prev) => (prev.some((e) => e.id === el.id) ? prev : [...prev, el]));
    },
    onElementUpdated: (elementId: string, patch: Partial<Element>) => {
      setElements((prev) =>
        prev.map((e) => (e.id === elementId ? { ...e, ...patch } : e))
      );
    },
    onElementDeleted: (elementId: string) => {
      setElements((prev) => prev.filter((e) => e.id !== elementId));
    },
    onCommentAdded: (comment: Comment) => {
      setComments((prev) => {
        if (comment.parentId) {
          return prev.map((c) =>
            c.id === comment.parentId
              ? { ...c, replies: [...(c.replies || []), comment] }
              : c
          );
        }
        return [...prev, comment];
      });
      toast.success(`${comment.user?.name} commented`);
    },
    onUserJoined: (user: { name: string }) => {
      toast.success(`${user.name} joined`);
    },
    onUserLeft: () => {},
  });

  const {
    connected,
    onlineUsers,
    remoteCursors,
    emitCursor,
    emitElementAdd,
    emitElementUpdate,
    emitElementDelete,
    emitCommentAdd,
  } = useBoardSocket(id, socketHandlers.current);

  const addElement = useCallback(
    async (partial: Omit<Element, "id" | "boardId" | "createdAt" | "updatedAt">) => {
      if (!id) throw new Error("No board");
      try {
      const { data } = await api.post<{ element: Element }>(`/boards/${id}/elements`, partial);
      const el = data.element;
      setElements((prev) => [...prev, el]);
      emitElementAdd(el);

      if (tool === "frame" && partial.data?.shape === "frame") {
        const { data: frameData } = await api.post<{ frame: Frame }>(`/boards/${id}/frames`, {
          name: `Frame ${frames.length + 1}`,
          x: partial.x,
          y: partial.y,
          width: partial.width,
          height: partial.height,
          order: frames.length,
        });
        setFrames((prev) => [...prev, frameData.frame]);
      }

      history.push({
        type: "add",
        undo: () => {
          setElements((prev) => prev.filter((e) => e.id !== el.id));
          void api.delete(`/boards/${id}/elements/${el.id}`);
          emitElementDelete(el.id);
        },
        redo: () => {
          setElements((prev) => [...prev, el]);
        },
      });

      return el;
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      }
    },
    [id, emitElementAdd, emitElementDelete, history, tool, frames.length]
  );

  const updateElement = useCallback(
    async (elementId: string, patch: Partial<Element>) => {
      if (!id) return;
      const prev = elements.find((e) => e.id === elementId);
      if (!prev) return;

      setElements((els) =>
        els.map((e) => (e.id === elementId ? { ...e, ...patch } : e))
      );
      await api.put(`/boards/${id}/elements/${elementId}`, patch);
      emitElementUpdate(elementId, patch);

      history.push({
        type: "update",
        undo: () => {
          setElements((els) =>
            els.map((e) => (e.id === elementId ? prev : e))
          );
          void api.put(`/boards/${id}/elements/${elementId}`, {
            x: prev.x,
            y: prev.y,
            width: prev.width,
            height: prev.height,
            rotation: prev.rotation,
            data: prev.data,
          });
        },
        redo: () => {
          setElements((els) =>
            els.map((e) => (e.id === elementId ? { ...e, ...patch } : e))
          );
        },
      });
    },
    [id, elements, emitElementUpdate, history]
  );

  const deleteElements = useCallback(
    async (ids: string[]) => {
      if (!id) return;
      const removed = elements.filter((e) => ids.includes(e.id));
      setElements((els) => els.filter((e) => !ids.includes(e.id)));
      setSelectedIds([]);

      for (const el of removed) {
        await api.delete(`/boards/${id}/elements/${el.id}`);
        emitElementDelete(el.id);
      }

      history.push({
        type: "delete",
        undo: () => setElements((els) => [...els, ...removed]),
        redo: () => setElements((els) => els.filter((e) => !ids.includes(e.id))),
      });
    },
    [id, elements, emitElementDelete, history]
  );

  const handleBoardNameChange = useCallback(
    async (name: string) => {
      if (!id || !board) return;
      setBoard({ ...board, name });
      boardNameRef.current = name;
      await api.put(`/boards/${id}`, { name });
    },
    [id, board]
  );

  const handleAlign = useCallback(
    (type: string) => {
      const selected = elements.filter((e) => selectedIds.includes(e.id));
      if (selected.length < 2) return;

      const xs = selected.map((e) => e.x);
      const ys = selected.map((e) => e.y);
      const rights = selected.map((e) => e.x + (e.width ?? 100));
      const bottoms = selected.map((e) => e.y + (e.height ?? 50));

      selected.forEach((el) => {
        let patch: Partial<Element> = {};
        if (type === "left") patch = { x: Math.min(...xs) };
        if (type === "center")
          patch = {
            x: (Math.min(...xs) + Math.max(...rights)) / 2 - (el.width ?? 100) / 2,
          };
        if (type === "right") patch = { x: Math.max(...rights) - (el.width ?? 100) };
        if (type === "top") patch = { y: Math.min(...ys) };
        if (type === "middle")
          patch = {
            y: (Math.min(...ys) + Math.max(...bottoms)) / 2 - (el.height ?? 50) / 2,
          };
        if (type === "bottom") patch = { y: Math.max(...bottoms) - (el.height ?? 50) };
        void updateElement(el.id, patch);
      });
    },
    [elements, selectedIds, updateElement]
  );

  const handleInvite = useCallback(async () => {
    if (!id || !inviteEmail.trim()) return;
    try {
      await api.post(`/boards/${id}/invite`, { email: inviteEmail.trim() });
      toast.success("Invite sent!");
      setInviteOpen(false);
      setInviteEmail("");
      loadBoard();
    } catch {
      toast.error("Could not invite user");
    }
  }, [id, inviteEmail, loadBoard]);

  const duplicateSelected = useCallback(async () => {
    for (const id of selectedIds) {
      const el = elements.find((e) => e.id === id);
      if (!el) continue;
      await addElement({
        type: el.type,
        x: el.x + 20,
        y: el.y + 20,
        width: el.width ?? undefined,
        height: el.height ?? undefined,
        rotation: el.rotation,
        data: { ...el.data },
        zIndex: elements.length,
      });
    }
  }, [selectedIds, elements, addElement]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        setSpaceHeld(true);
      }

      const key = e.key.toLowerCase();
      if (!e.ctrlKey && !e.metaKey && TOOL_SHORTCUTS[key]) {
        setTool(TOOL_SHORTCUTS[key]);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        history.redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        // copy handled via duplicate on paste
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        void duplicateSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setSelectedIds(elements.map((el) => el.id));
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setPresenting(true);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          void deleteElements(selectedIds);
        }
      }

      const nudge = e.shiftKey ? 10 : 1;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && selectedIds.length) {
        e.preventDefault();
        const dx = e.key === "ArrowLeft" ? -nudge : e.key === "ArrowRight" ? nudge : 0;
        const dy = e.key === "ArrowUp" ? -nudge : e.key === "ArrowDown" ? nudge : 0;
        selectedIds.forEach((sid) => {
          const el = elements.find((x) => x.id === sid);
          if (el) void updateElement(sid, { x: el.x + dx, y: el.y + dy });
        });
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [elements, selectedIds, history, deleteElements, updateElement, duplicateSelected]);

  useEffect(() => {
    if (tool !== "comment") return;
    function onClick(e: MouseEvent) {
      const container = document.getElementById("board-container");
      if (!container?.contains(e.target as Node)) return;
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [tool]);

  const handleFit = useCallback(() => {
    if (elements.length === 0) {
      setViewport({ x: 0, y: 0, scale: 1 });
      return;
    }
    const container = document.getElementById("board-container");
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach((el) => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width ?? 100));
      maxY = Math.max(maxY, el.y + (el.height ?? 50));
    });

    const bw = maxX - minX + 80;
    const bh = maxY - minY + 80;
    const scale = Math.min(cw / bw, ch / bh, 1.5);
    setViewport({
      scale,
      x: (cw - bw * scale) / 2 - minX * scale + 40 * scale,
      y: (ch - bh * scale) / 2 - minY * scale + 40 * scale,
    });
  }, [elements]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-canvas-primary border-t-transparent" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-2xl">Board not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {!connected && (
        <div className="bg-canvas-yellow px-4 py-2 text-center text-lg">
          Reconnecting...
        </div>
      )}

      <TopBar
        boardName={board.name}
        zoom={viewport.scale}
        onlineUsers={onlineUsers}
        onNameChange={handleBoardNameChange}
        onPresent={() => setPresenting(true)}
        onInvite={() => setInviteOpen(true)}
        onFit={handleFit}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <Toolbar
          tool={tool}
          color={color}
          brushSize={brushSize}
          onToolChange={setTool}
          onColorChange={setColor}
          onBrushSizeChange={setBrushSize}
        />
        <Toolbar
          tool={tool}
          color={color}
          brushSize={brushSize}
          onToolChange={setTool}
          onColorChange={setColor}
          onBrushSizeChange={setBrushSize}
          mobile
        />

        <div className="relative flex-1">
          <CanvasStage
            elements={elements}
            tool={tool}
            color={color}
            brushSize={brushSize}
            selectedIds={selectedIds}
            viewport={viewport}
            onViewportChange={(v) => setViewport((prev) => ({ ...prev, ...v }))}
            onSelect={setSelectedIds}
            onElementsChange={(fn) => setElements(fn)}
            onAddElement={addElement}
            onUpdateElement={updateElement}
            onDeleteElements={deleteElements}
            onCursorMove={emitCursor}
            onCommentPlace={async (x, y) => {
              const text = prompt("Comment:");
              if (!text?.trim() || !id) return;
              const { data } = await api.post<{ comment: Comment }>(`/boards/${id}/comments`, {
                x,
                y,
                text: text.trim(),
              });
              setComments((prev) => [...prev, data.comment]);
              emitCommentAdd(data.comment);
              toast.success("Comment added");
            }}
            spaceHeld={spaceHeld}
          />

          <RemoteCursors cursors={remoteCursors} viewport={viewport} />

          {comments
            .filter((c) => !c.resolved)
            .map((c) => {
              const sx = c.x * viewport.scale + viewport.x;
              const sy = c.y * viewport.scale + viewport.y;
              return (
                <button
                  key={c.id}
                  type="button"
                  className="absolute z-20 flex h-8 w-8 items-center justify-center rounded-full bg-canvas-primary text-white shadow-md"
                  style={{ left: sx, top: sy }}
                  onClick={() => setActiveComment(c.id)}
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              );
            })}
        </div>

        <RightPanel
          selectedIds={selectedIds}
          elements={elements}
          members={board.members}
          frames={frames}
          boardName={board.name}
          onUpdateElement={updateElement}
          onAlign={handleAlign}
        />
      </div>

      {presenting && (
        <PresentationMode
          frames={frames}
          viewport={viewport}
          onViewportChange={(v) => setViewport((prev) => ({ ...prev, ...v }))}
          onClose={() => setPresenting(false)}
        />
      )}

      {activeComment && (
        <div className="fixed right-4 top-20 z-40 w-80 rounded-xl border-2 border-black bg-white p-4 shadow-card">
          {(() => {
            const c = comments.find((x) => x.id === activeComment);
            if (!c) return null;
            return (
              <>
                <p className="mb-2 font-medium">{c.user?.name}</p>
                <p className="mb-4">{c.text}</p>
                {c.replies?.map((r) => (
                  <div key={r.id} className="mb-2 ml-4 border-l-2 border-black/10 pl-3">
                    <p className="text-sm font-medium">{r.user?.name}</p>
                    <p>{r.text}</p>
                  </div>
                ))}
                <input
                  type="text"
                  placeholder="Reply..."
                  className="input-field mb-2"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      const text = e.currentTarget.value.trim();
                      const { data } = await api.post<{ comment: Comment }>(
                        `/boards/${id}/comments`,
                        { x: c.x, y: c.y, text, parentId: c.id }
                      );
                      setComments((prev) =>
                        prev.map((cm) =>
                          cm.id === c.id
                            ? { ...cm, replies: [...(cm.replies || []), data.comment] }
                            : cm
                        )
                      );
                      emitCommentAdd(data.comment);
                      e.currentTarget.value = "";
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={async () => {
                      await api.put(`/boards/${id}/comments/${c.id}`, { resolved: true });
                      setComments((prev) =>
                        prev.map((cm) =>
                          cm.id === c.id ? { ...cm, resolved: true } : cm
                        )
                      );
                      setActiveComment(null);
                    }}
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    className="text-sm underline"
                    onClick={() => setActiveComment(null)}
                  >
                    Close
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card-surface w-full max-w-md p-6">
            <h2 className="mb-4 font-chewy text-3xl">Invite collaborator</h2>
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="input-field mb-4"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setInviteOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleInvite} className="btn-primary">
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
