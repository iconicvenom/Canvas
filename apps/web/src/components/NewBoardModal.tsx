import { useState } from "react";
import type { TemplateId } from "@canvas/shared";
import { GitFork, ListChecks, CircleUserRound, PencilRuler, Square } from "lucide-react";

const TEMPLATES: { id: TemplateId; name: string; icon: React.ReactNode; colors: string[] }[] = [
  { id: "blank", name: "Blank", icon: <Square className="h-8 w-8" />, colors: ["#fdfcf9"] },
  {
    id: "brainstorm",
    name: "Brainstorm",
    icon: <GitFork className="h-8 w-8" />,
    colors: ["#ffe978", "#93f4be", "#f28cbd"],
  },
  {
    id: "kanban",
    name: "Kanban",
    icon: <ListChecks className="h-8 w-8" />,
    colors: ["#9fe5ff", "#93f4be", "#ffe978"],
  },
  {
    id: "mindmap",
    name: "Mind Map",
    icon: <CircleUserRound className="h-8 w-8" />,
    colors: ["#0b7cff", "#9fe5ff"],
  },
  {
    id: "roadmap",
    name: "Roadmap",
    icon: <PencilRuler className="h-8 w-8" />,
    colors: ["#ffe978", "#93f4be", "#ffbd91"],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, templateId: TemplateId) => Promise<void>;
}

export function NewBoardModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>("blank");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate(name.trim(), templateId);
      setName("");
      setTemplateId("blank");
      onClose();
    } catch {
      // Parent shows the error toast
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card-surface w-full max-w-lg p-6">
        <h2 className="mb-4 font-chewy text-3xl">New Board</h2>
        <input
          type="text"
          placeholder="Board name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim() && !loading) void handleCreate();
          }}
          className="input-field mb-4"
          autoFocus
        />
        <p className="mb-3 text-xl">Choose a template</p>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={`rounded-xl border-2 p-3 text-center transition ${
                templateId === t.id
                  ? "border-canvas-primary bg-canvas-primary/10"
                  : "border-black/20 hover:border-black"
              }`}
            >
              <div className="mb-2 flex justify-center">{t.icon}</div>
              <p className="text-lg">{t.name}</p>
              <div className="mt-2 flex justify-center gap-1">
                {t.colors.map((c) => (
                  <span
                    key={c}
                    className="h-3 w-3 rounded-sm border border-black/20"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="btn-primary"
          >
            {loading ? "Creating..." : "Create board"}
          </button>
        </div>
      </div>
    </div>
  );
}
