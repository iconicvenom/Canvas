import { useCallback, useRef, useState } from "react";

export interface HistoryAction {
  type: "add" | "update" | "delete" | "batch";
  undo: () => void;
  redo: () => void;
}

export function useHistory(maxSize = 100) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const past = useRef<HistoryAction[]>([]);
  const future = useRef<HistoryAction[]>([]);

  const push = useCallback(
    (action: HistoryAction) => {
      past.current.push(action);
      if (past.current.length > maxSize) past.current.shift();
      future.current = [];
      setCanUndo(true);
      setCanRedo(false);
    },
    [maxSize]
  );

  const undo = useCallback(() => {
    const action = past.current.pop();
    if (!action) return;
    action.undo();
    future.current.push(action);
    setCanUndo(past.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    const action = future.current.pop();
    if (!action) return;
    action.redo();
    past.current.push(action);
    setCanUndo(true);
    setCanRedo(future.current.length > 0);
  }, []);

  return { push, undo, redo, canUndo, canRedo };
}
