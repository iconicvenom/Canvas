import type { Element, BoardMember, Frame } from "@canvas/shared";
import { STICKY_COLORS } from "@canvas/shared";
import { AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical } from "lucide-react";

interface Props {
  selectedIds: string[];
  elements: Element[];
  members: BoardMember[];
  frames: Frame[];
  boardName: string;
  onUpdateElement: (id: string, patch: Partial<Element>) => void;
  onAlign: (type: string) => void;
}

export function RightPanel({
  selectedIds,
  elements,
  members,
  frames,
  boardName,
  onUpdateElement,
  onAlign,
}: Props) {
  const selected = elements.filter((e) => selectedIds.includes(e.id));
  const single = selected.length === 1 ? selected[0] : null;

  if (selected.length === 0) {
    return (
      <aside className="hidden w-64 flex-shrink-0 border-l-2 border-black/10 bg-white p-4 lg:block">
        <h3 className="mb-2 font-chewy text-2xl">{boardName}</h3>
        <p className="mb-4 text-lg text-black/60">Board info</p>
        <p className="mb-2 text-lg font-medium">Members</p>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-white"
                style={{ backgroundColor: m.user?.avatarColor }}
              >
                {m.user?.name?.[0]}
              </span>
              <span>{m.user?.name}</span>
              <span className="text-sm text-black/50">{m.role}</span>
            </li>
          ))}
        </ul>
        {frames.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-lg font-medium">Frames ({frames.length})</p>
            <ul className="space-y-1 text-lg">
              {frames.map((f) => (
                <li key={f.id}>{f.name}</li>
              ))}
            </ul>
          </>
        )}
      </aside>
    );
  }

  if (selected.length > 1) {
    return (
      <aside className="hidden w-64 flex-shrink-0 border-l-2 border-black/10 bg-white p-4 lg:block">
        <p className="mb-4 text-lg">{selected.length} items selected</p>
        <p className="mb-2 font-medium">Align</p>
        <div className="flex flex-wrap gap-2">
          {[
            { type: "left", icon: <AlignLeft className="h-4 w-4" /> },
            { type: "center", icon: <AlignCenter className="h-4 w-4" /> },
            { type: "right", icon: <AlignRight className="h-4 w-4" /> },
            { type: "top", icon: <AlignStartVertical className="h-4 w-4" /> },
            { type: "middle", icon: <AlignCenterVertical className="h-4 w-4" /> },
            { type: "bottom", icon: <AlignEndVertical className="h-4 w-4" /> },
          ].map((a) => (
            <button
              key={a.type}
              type="button"
              onClick={() => onAlign(a.type)}
              className="rounded-lg border-2 border-black p-2 hover:bg-black/5"
            >
              {a.icon}
            </button>
          ))}
        </div>
      </aside>
    );
  }

  if (!single) return null;

  return (
    <aside className="hidden w-64 flex-shrink-0 border-l-2 border-black/10 bg-white p-4 lg:block">
      <p className="mb-4 text-lg capitalize">{single.type} properties</p>

      {single.type === "sticky" && (
        <>
          <p className="mb-2 font-medium">Color</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {STICKY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  onUpdateElement(single.id, {
                    data: { ...single.data, color: c },
                  })
                }
                className="h-7 w-7 rounded border-2 border-black"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <label className="mb-2 block font-medium">Font size</label>
          <input
            type="number"
            min={12}
            max={48}
            value={(single.data.fontSize as number) || 18}
            onChange={(e) =>
              onUpdateElement(single.id, {
                data: { ...single.data, fontSize: Number(e.target.value) },
              })
            }
            className="input-field"
          />
        </>
      )}

      {(single.type === "shape" || single.type === "arrow") && (
        <>
          <label className="mb-2 block font-medium">Fill</label>
          <input
            type="color"
            value={(single.data.fill as string) || "#ffffff"}
            onChange={(e) =>
              onUpdateElement(single.id, {
                data: { ...single.data, fill: e.target.value },
              })
            }
            className="mb-4 h-10 w-full"
          />
          <label className="mb-2 block font-medium">Stroke width</label>
          <input
            type="number"
            min={1}
            max={10}
            value={(single.data.strokeWidth as number) || 2}
            onChange={(e) =>
              onUpdateElement(single.id, {
                data: { ...single.data, strokeWidth: Number(e.target.value) },
              })
            }
            className="input-field"
          />
        </>
      )}

      {single.type === "text" && (
        <>
          <label className="mb-2 block font-medium">Font size</label>
          <input
            type="number"
            min={12}
            max={72}
            value={(single.data.fontSize as number) || 24}
            onChange={(e) =>
              onUpdateElement(single.id, {
                data: { ...single.data, fontSize: Number(e.target.value) },
              })
            }
            className="input-field mb-4"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!single.data.bold}
              onChange={(e) =>
                onUpdateElement(single.id, {
                  data: { ...single.data, bold: e.target.checked },
                })
              }
            />
            Bold
          </label>
        </>
      )}
    </aside>
  );
}
