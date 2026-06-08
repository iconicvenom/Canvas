import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Rect, Circle, Text, Arrow, Group, Transformer } from "react-konva";
import type Konva from "konva";
import type { Element } from "@canvas/shared";
import type { Tool, Viewport } from "./types";

interface Props {
  elements: Element[];
  tool: Tool;
  color: string;
  brushSize: number;
  selectedIds: string[];
  viewport: Viewport;
  onViewportChange: (v: Partial<Viewport>) => void;
  onSelect: (ids: string[]) => void;
  onElementsChange: (updater: (els: Element[]) => Element[]) => void;
  onAddElement: (el: Omit<Element, "id" | "boardId" | "createdAt" | "updatedAt">) => Promise<Element>;
  onUpdateElement: (id: string, patch: Partial<Element>) => void;
  onDeleteElements: (ids: string[]) => void;
  onCursorMove: (x: number, y: number) => void;
  onCommentPlace?: (x: number, y: number) => void;
  spaceHeld: boolean;
}

function screenToCanvas(
  sx: number,
  sy: number,
  viewport: Viewport
): { x: number; y: number } {
  return {
    x: (sx - viewport.x) / viewport.scale,
    y: (sy - viewport.y) / viewport.scale,
  };
}

export function CanvasStage({
  elements,
  tool,
  color,
  brushSize,
  selectedIds,
  viewport,
  onViewportChange,
  onSelect,
  onElementsChange,
  onAddElement,
  onUpdateElement,
  onDeleteElements,
  onCursorMove,
  onCommentPlace,
  spaceHeld,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [drawing, setDrawing] = useState<number[] | null>(null);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapePreview, setShapePreview] = useState<Partial<Element> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPos, setEditPos] = useState({ x: 0, y: 0, w: 200, h: 100 });
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const rubberBand = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    const nodes = selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, elements]);

  const effectiveTool = spaceHeld ? "pan" : tool;

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.08;
      const oldScale = viewport.scale;
      const newScale =
        e.evt.deltaY < 0
          ? Math.min(oldScale * scaleBy, 5)
          : Math.max(oldScale / scaleBy, 0.05);

      const mousePointTo = {
        x: (pointer.x - viewport.x) / oldScale,
        y: (pointer.y - viewport.y) / oldScale,
      };

      onViewportChange({
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [viewport, onViewportChange]
  );

  const handlePointerDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const canvasPos = screenToCanvas(pos.x, pos.y, viewport);
      onCursorMove(canvasPos.x, canvasPos.y);

      if (effectiveTool === "pan" || ("button" in e.evt && e.evt.button === 1)) {
        isPanning.current = true;
        lastPan.current = { x: pos.x, y: pos.y };
        return;
      }

      if (effectiveTool === "select") {
        if (e.target === stage) {
          rubberBand.current = { x: canvasPos.x, y: canvasPos.y, w: 0, h: 0 };
          onSelect([]);
        }
        return;
      }

      if (effectiveTool === "sticky") {
        const rot = (Math.random() - 0.5) * 10;
        void onAddElement({
          type: "sticky",
          x: canvasPos.x - 100,
          y: canvasPos.y - 100,
          width: 200,
          height: 200,
          rotation: rot,
          data: { text: "", color, fontSize: 18 },
          zIndex: elements.length,
        });
        return;
      }

      if (effectiveTool === "text") {
        void onAddElement({
          type: "text",
          x: canvasPos.x,
          y: canvasPos.y,
          data: { text: "Text", fontSize: 24, color: "#000000" },
          rotation: 0,
          zIndex: elements.length,
        });
        return;
      }

      if (effectiveTool === "comment") {
        onCommentPlace?.(canvasPos.x, canvasPos.y);
        return;
      }

      if (["pen", "rectangle", "circle", "line", "arrow", "frame"].includes(effectiveTool)) {
        setShapeStart(canvasPos);
        if (effectiveTool === "pen") {
          setDrawing([canvasPos.x, canvasPos.y]);
        }
      }
    },
    [effectiveTool, viewport, color, elements.length, onAddElement, onSelect, onCursorMove]
  );

  const handlePointerMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      const canvasPos = screenToCanvas(pos.x, pos.y, viewport);
      onCursorMove(canvasPos.x, canvasPos.y);

      if (isPanning.current) {
        const dx = pos.x - lastPan.current.x;
        const dy = pos.y - lastPan.current.y;
        lastPan.current = { x: pos.x, y: pos.y };
        onViewportChange({ x: viewport.x + dx, y: viewport.y + dy });
        return;
      }

      if (drawing && effectiveTool === "pen") {
        setDrawing((d) => [...(d || []), canvasPos.x, canvasPos.y]);
        return;
      }

      if (shapeStart && ["rectangle", "circle", "line", "arrow", "frame"].includes(effectiveTool)) {
        const x = Math.min(shapeStart.x, canvasPos.x);
        const y = Math.min(shapeStart.y, canvasPos.y);
        const w = Math.abs(canvasPos.x - shapeStart.x);
        const h = Math.abs(canvasPos.y - shapeStart.y);

        if (effectiveTool === "line" || effectiveTool === "arrow") {
          setShapePreview({
            type: effectiveTool === "arrow" ? "arrow" : "shape",
            x: shapeStart.x,
            y: shapeStart.y,
            data: {
              points: [shapeStart.x, shapeStart.y, canvasPos.x, canvasPos.y],
              stroke: "#000000",
              strokeWidth: 2,
              shape: effectiveTool,
            },
          });
        } else {
          setShapePreview({
            type: effectiveTool === "frame" ? "shape" : "shape",
            x,
            y,
            width: w,
            height: h,
            data: {
              shape: effectiveTool === "frame" ? "frame" : "rectangle",
              fill: effectiveTool === "frame" ? "transparent" : color,
              stroke: "#000000",
              strokeWidth: 2,
              dash: effectiveTool === "frame" ? [8, 4] : undefined,
            },
          });
        }
      }

      if (rubberBand.current && effectiveTool === "select") {
        const rb = rubberBand.current;
        rubberBand.current = {
          x: rb.x,
          y: rb.y,
          w: canvasPos.x - rb.x,
          h: canvasPos.y - rb.y,
        };
      }
    },
    [viewport, drawing, shapeStart, effectiveTool, onViewportChange, onCursorMove]
  );

  const handlePointerUp = useCallback(async () => {
    isPanning.current = false;

    if (drawing && drawing.length >= 4) {
      await onAddElement({
        type: "drawing",
        x: 0,
        y: 0,
        data: { points: drawing, stroke: "#000000", strokeWidth: brushSize },
        rotation: 0,
        zIndex: elements.length,
      });
    }
    setDrawing(null);

    if (shapeStart && shapePreview) {
      if (effectiveTool === "frame") {
        // Frame creation handled by parent via separate API
        await onAddElement({
          type: "shape",
          x: shapePreview.x!,
          y: shapePreview.y!,
          width: shapePreview.width,
          height: shapePreview.height,
          rotation: 0,
          data: shapePreview.data!,
          zIndex: elements.length,
        });
      } else if (effectiveTool === "arrow") {
        await onAddElement({
          type: "arrow",
          x: shapePreview.x!,
          y: shapePreview.y!,
          data: shapePreview.data!,
          rotation: 0,
          zIndex: elements.length,
        });
      } else if (effectiveTool === "line") {
        await onAddElement({
          type: "shape",
          x: shapePreview.x!,
          y: shapePreview.y!,
          data: shapePreview.data!,
          rotation: 0,
          zIndex: elements.length,
        });
      } else if ((shapePreview.width ?? 0) > 5 || (shapePreview.height ?? 0) > 5) {
        await onAddElement({
          type: "shape",
          x: shapePreview.x!,
          y: shapePreview.y!,
          width: shapePreview.width,
          height: shapePreview.height,
          rotation: 0,
          data: {
            shape: effectiveTool,
            fill: color,
            stroke: "#000000",
            strokeWidth: 2,
          },
          zIndex: elements.length,
        });
      }
    }
    setShapeStart(null);
    setShapePreview(null);

    if (rubberBand.current) {
      const rb = rubberBand.current;
      const x1 = Math.min(rb.x, rb.x + rb.w);
      const y1 = Math.min(rb.y, rb.y + rb.h);
      const x2 = Math.max(rb.x, rb.x + rb.w);
      const y2 = Math.max(rb.y, rb.y + rb.h);
      const hits = elements.filter((el) => {
        const ex = el.x;
        const ey = el.y;
        const ew = el.width ?? 100;
        const eh = el.height ?? 50;
        return ex < x2 && ex + ew > x1 && ey < y2 && ey + eh > y1;
      });
      onSelect(hits.map((h) => h.id));
      rubberBand.current = null;
    }
  }, [
    drawing,
    shapeStart,
    shapePreview,
    effectiveTool,
    brushSize,
    color,
    elements,
    onAddElement,
    onSelect,
  ]);

  function startEdit(el: Element) {
    const stage = stageRef.current;
    if (!stage) return;
    const text = (el.data.text as string) || "";
    setEditingId(el.id);
    setEditText(text);
    const sx = el.x * viewport.scale + viewport.x;
    const sy = el.y * viewport.scale + viewport.y;
    const sw = (el.width ?? 200) * viewport.scale;
    const sh = (el.height ?? 100) * viewport.scale;
    setEditPos({ x: sx, y: sy, w: sw, h: sh });
  }

  function commitEdit() {
    if (editingId) {
      const el = elements.find((e) => e.id === editingId);
      if (el) {
        onUpdateElement(editingId, { data: { ...el.data, text: editText } });
      }
    }
    setEditingId(null);
  }

  function renderElement(el: Element) {
    const common = {
      id: el.id,
      x: el.x,
      y: el.y,
      rotation: el.rotation,
      draggable: effectiveTool === "select" && !editingId,
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        if (effectiveTool === "eraser") {
          onDeleteElements([el.id]);
          return;
        }
        if (effectiveTool === "select") {
          const additive = e.evt.shiftKey;
          onSelect(
            additive
              ? selectedIds.includes(el.id)
                ? selectedIds.filter((id) => id !== el.id)
                : [...selectedIds, el.id]
              : [el.id]
          );
        }
      },
      onDblClick: () => {
        if (el.type === "sticky" || el.type === "text") startEdit(el);
      },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        onUpdateElement(el.id, { x: e.target.x(), y: e.target.y() });
      },
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
        const node = e.target;
        onUpdateElement(el.id, {
          x: node.x(),
          y: node.y(),
          width: node.width() * node.scaleX(),
          height: node.height() * node.scaleY(),
          rotation: node.rotation(),
        });
        node.scaleX(1);
        node.scaleY(1);
      },
    };

    if (el.type === "sticky") {
      const fill = (el.data.color as string) || "#ffe978";
      const text = (el.data.text as string) || "";
      const fontSize = (el.data.fontSize as number) || 18;
      return (
        <Group key={el.id} {...common} width={el.width ?? 200} height={el.height ?? 200}>
          <Rect
            width={el.width ?? 200}
            height={el.height ?? 200}
            fill={fill}
            stroke="#000000"
            strokeWidth={2}
            shadowColor="black"
            shadowBlur={8}
            shadowOpacity={0.15}
          />
          <Rect
            x={(el.width ?? 200) / 2 - 40}
            y={-14}
            width={80}
            height={14}
            fill="rgba(0,0,0,0.15)"
            rotation={-1}
          />
          <Text
            text={text}
            width={el.width ?? 200}
            height={el.height ?? 200}
            padding={12}
            fontSize={fontSize}
            fontFamily="Patrick Hand"
            wrap="word"
          />
        </Group>
      );
    }

    if (el.type === "text") {
      return (
        <Text
          key={el.id}
          {...common}
          text={(el.data.text as string) || "Text"}
          fontSize={(el.data.fontSize as number) || 24}
          fontFamily="Patrick Hand"
          fontStyle={(el.data.bold as boolean) ? "bold" : "normal"}
          fill={(el.data.color as string) || "#000000"}
        />
      );
    }

    if (el.type === "drawing") {
      const points = (el.data.points as number[]) || [];
      return (
        <Line
          key={el.id}
          {...common}
          points={points}
          stroke={(el.data.stroke as string) || "#000000"}
          strokeWidth={(el.data.strokeWidth as number) || 2}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={20}
        />
      );
    }

    if (el.type === "arrow") {
      const points = (el.data.points as number[]) || [];
      if (points.length >= 4) {
        return (
          <Arrow
            key={el.id}
            points={points}
            stroke={(el.data.stroke as string) || "#000000"}
            strokeWidth={(el.data.strokeWidth as number) || 2}
            fill={(el.data.stroke as string) || "#000000"}
            pointerLength={12}
            pointerWidth={12}
            listening
            onClick={common.onClick}
          />
        );
      }
    }

    if (el.type === "shape") {
      const shape = (el.data.shape as string) || "rectangle";
      const fill = (el.data.fill as string) || "transparent";
      const stroke = (el.data.stroke as string) || "#000000";
      const sw = (el.data.strokeWidth as number) || 2;
      const dash = el.data.dash as number[] | undefined;

      if (shape === "line") {
        const points = (el.data.points as number[]) || [];
        return (
          <Line
            key={el.id}
            points={points}
            stroke={stroke}
            strokeWidth={sw}
            lineCap="round"
            listening
            onClick={common.onClick}
          />
        );
      }

      if (shape === "circle") {
        const w = el.width ?? 100;
        const h = el.height ?? 100;
        const r = Math.max(w, h) / 2;
        return (
          <Circle
            key={el.id}
            x={el.x + w / 2}
            y={el.y + h / 2}
            rotation={el.rotation}
            radius={r}
            scaleX={w / (2 * r)}
            scaleY={h / (2 * r)}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            draggable={common.draggable}
            onClick={common.onClick}
            onDragEnd={common.onDragEnd}
            onTransformEnd={common.onTransformEnd}
          />
        );
      }

      return (
        <Rect
          key={el.id}
          {...common}
          width={el.width ?? 100}
          height={el.height ?? 100}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          dash={dash}
          cornerRadius={(el.data.cornerRadius as number) || 0}
        />
      );
    }

    if (el.type === "image" && el.data.url) {
      return null;
    }

    return null;
  }

  const gridLines = [];
  const gridSize = 44;
  const startX = Math.floor(-viewport.x / viewport.scale / gridSize) * gridSize;
  const startY = Math.floor(-viewport.y / viewport.scale / gridSize) * gridSize;
  const endX = startX + size.width / viewport.scale + gridSize * 2;
  const endY = startY + size.height / viewport.scale + gridSize * 2;

  for (let x = startX; x < endX; x += gridSize) {
    for (let y = startY; y < endY; y += gridSize) {
      gridLines.push(
        <Circle key={`${x}-${y}`} x={x} y={y} radius={1.5} fill="rgba(11,124,255,0.2)" listening={false} />
      );
    }
  }

  return (
    <div ref={containerRef} id="board-container" className="relative h-full w-full overflow-hidden bg-canvas-bg">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        x={viewport.x}
        y={viewport.y}
        onWheel={handleWheel}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        style={{ cursor: effectiveTool === "pan" ? "grab" : effectiveTool === "select" ? "default" : "crosshair" }}
      >
        <Layer listening={false}>{gridLines}</Layer>
        <Layer>
          {elements.map(renderElement)}
          {drawing && (
            <Line
              points={drawing}
              stroke="#000000"
              strokeWidth={brushSize}
              tension={0.5}
              lineCap="round"
              listening={false}
            />
          )}
          {shapePreview && shapePreview.data?.points && (
            <Arrow
              points={shapePreview.data.points as number[]}
              stroke="#000000"
              strokeWidth={2}
              fill="#000000"
              pointerLength={12}
              pointerWidth={12}
              listening={false}
            />
          )}
          {shapePreview && !shapePreview.data?.points && (
            <Rect
              x={shapePreview.x}
              y={shapePreview.y}
              width={shapePreview.width ?? undefined}
              height={shapePreview.height ?? undefined}
              fill={(shapePreview.data?.fill as string) || "transparent"}
              stroke="#000000"
              strokeWidth={2}
              dash={shapePreview.data?.dash as number[] | undefined}
              listening={false}
            />
          )}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 10 || newBox.height < 10) return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>

      {editingId && (
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitEdit}
          autoFocus
          className="absolute z-20 resize-none border-2 border-canvas-primary bg-transparent p-2 font-hand outline-none"
          style={{
            left: editPos.x,
            top: editPos.y,
            width: editPos.w,
            height: editPos.h,
            fontSize: 18,
          }}
        />
      )}
    </div>
  );
}
