import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Element, Comment } from "@canvas/shared";
import { getAccessToken, WS_URL } from "@/lib/api";

export interface OnlineUser {
  userId: string;
  name: string;
  avatarColor: string;
}

export interface RemoteCursor {
  userId: string;
  name: string;
  avatarColor: string;
  x: number;
  y: number;
}

interface SocketHandlers {
  onElementAdded: (element: Element) => void;
  onElementUpdated: (elementId: string, patch: Partial<Element>) => void;
  onElementDeleted: (elementId: string) => void;
  onCommentAdded: (comment: Comment) => void;
  onUserJoined: (user: OnlineUser) => void;
  onUserLeft: (userId: string) => void;
}

export function useBoardSocket(boardId: string | undefined, handlers: SocketHandlers) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!boardId) return;

    const socket = io(WS_URL, {
      auth: { token: getAccessToken() },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-board", { boardId });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("online-users", (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    socket.on("user-joined", (user: OnlineUser) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.userId === user.userId)) return prev;
        return [...prev, user];
      });
      handlersRef.current.onUserJoined(user);
    });

    socket.on("user-left", ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== userId));
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
      handlersRef.current.onUserLeft(userId);
    });

    socket.on("cursor-update", (cursor: RemoteCursor) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(cursor.userId, cursor);
        return next;
      });
    });

    socket.on("element-added", ({ element }: { element: Element }) => {
      handlersRef.current.onElementAdded(element);
    });

    socket.on("element-updated", ({
      elementId,
      patch,
    }: {
      elementId: string;
      patch: Partial<Element>;
    }) => {
      handlersRef.current.onElementUpdated(elementId, patch);
    });

    socket.on("element-deleted", ({ elementId }: { elementId: string }) => {
      handlersRef.current.onElementDeleted(elementId);
    });

    socket.on("comment-added", ({ comment }: { comment: Comment }) => {
      handlersRef.current.onCommentAdded(comment);
    });

    return () => {
      socket.emit("leave-board", { boardId });
      socket.disconnect();
    };
  }, [boardId]);

  const emitCursor = useCallback(
    (x: number, y: number) => {
      if (!boardId || !socketRef.current?.connected) return;
      socketRef.current.emit("cursor-move", { boardId, x, y });
    },
    [boardId]
  );

  const emitElementAdd = useCallback(
    (element: Element) => {
      if (!boardId) return;
      socketRef.current?.emit("element-add", { boardId, element });
    },
    [boardId]
  );

  const emitElementUpdate = useCallback(
    (elementId: string, patch: Record<string, unknown>) => {
      if (!boardId) return;
      socketRef.current?.emit("element-update", { boardId, elementId, patch });
    },
    [boardId]
  );

  const emitElementDelete = useCallback(
    (elementId: string) => {
      if (!boardId) return;
      socketRef.current?.emit("element-delete", { boardId, elementId });
    },
    [boardId]
  );

  const emitCommentAdd = useCallback(
    (comment: Partial<Comment>) => {
      if (!boardId) return;
      socketRef.current?.emit("comment-add", { boardId, comment });
    },
    [boardId]
  );

  return {
    connected,
    onlineUsers,
    remoteCursors,
    emitCursor,
    emitElementAdd,
    emitElementUpdate,
    emitElementDelete,
    emitCommentAdd,
  };
}
