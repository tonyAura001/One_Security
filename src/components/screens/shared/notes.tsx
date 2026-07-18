"use client";

import { useMemo, useState } from "react";
import { Pin, Plus, Search, StickyNote } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Button } from "@/aurantir-front-kit";
import { formatRelativeTime } from "@/aurantir-front-kit/lib/utils";
import { useSession } from "@/lib/store/session";
import { getNotes, type DemoNote, type NoteColor } from "@/lib/api/notes";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Tab = "actives" | "archives";
type Filtre = "toutes" | "mes-notes" | "epinglees";

const NOTE_BORDER: Record<NoteColor, string> = {
  accent: "border-l-blue",
  success: "border-l-green",
  warning: "border-l-amber",
  danger: "border-l-red",
  violet: "border-l-violet",
  neutral: "border-l-surface-border",
};

const FILTERS: [Filtre, string][] = [
  ["toutes", "Toutes"],
  ["mes-notes", "Mes notes"],
  ["epinglees", "Épinglées"],
];

export function NotesScreen() {
  const { role } = useSession();
  const base = useMemo(() => getNotes(role), [role]);
  const [overrides, setOverrides] = useState<
    Record<string, { pinned?: boolean; archived?: boolean }>
  >({});
  const [tab, setTab] = useState<Tab>("actives");
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [search, setSearch] = useState("");

  const notes = base.map((n) => ({ ...n, ...overrides[n.id] }));

  function togglePin(n: DemoNote) {
    setOverrides((o) => ({ ...o, [n.id]: { ...o[n.id], pinned: !n.pinned } }));
    toast.success(n.pinned ? "Note désépinglée" : "Note épinglée");
  }

  const q = search.trim().toLowerCase();
  const filtered = notes.filter((n) => {
    if (n.archived !== (tab === "archives")) return false;
    if (filtre === "mes-notes" && n.authorRole !== role) return false;
    if (filtre === "epinglees" && !n.pinned) return false;
    if (
      q &&
      !n.title.toLowerCase().includes(q) &&
      !n.content.toLowerCase().includes(q)
    )
      return false;
    return true;
  });
  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  return (
    <ScreenContainer>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="page-subtitle">Base de connaissance partagée</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search
              size={14}
              className="text-text-muted absolute top-1/2 left-3 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Rechercher une note"
              className="input w-56 py-1.5 pl-9 text-sm"
            />
          </div>
          <Button
            size="sm"
            icon={<Plus size={13} strokeWidth={2.5} />}
            onClick={() =>
              toast.info("Nouvelle note", "Fonction de démonstration")
            }
          >
            Nouvelle note
          </Button>
        </div>
      </div>

      {/* Onglets Actives / Archives */}
      <div
        role="tablist"
        aria-label="État des notes"
        className="border-surface-border mt-4 flex items-center gap-1 border-b"
      >
        {(["actives", "archives"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "border-blue text-text-primary"
                : "text-text-muted hover:text-text-primary border-transparent",
            )}
          >
            {t === "actives" ? "Actives" : "Archives"}
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="mt-3 flex items-center gap-1.5">
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFiltre(v)}
            aria-pressed={filtre === v}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filtre === v
                ? "bg-blue/10 text-blue"
                : "text-text-muted hover:bg-surface-hover",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="mt-5 space-y-6">
        {filtered.length === 0 ? (
          <div className="text-text-muted flex flex-col items-center justify-center py-16 text-center">
            <StickyNote size={32} className="mb-3 opacity-30" />
            <p className="text-sm">
              {tab === "archives"
                ? "Aucune note archivée"
                : "Aucune note trouvée"}
            </p>
            {tab === "actives" && (
              <button
                onClick={() =>
                  toast.info("Nouvelle note", "Fonction de démonstration")
                }
                className="text-blue mt-3 inline-flex items-center gap-1 text-xs hover:underline"
              >
                <Plus size={12} /> Nouvelle note
              </button>
            )}
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <NoteSection
                label="Épinglées"
                notes={pinned}
                role={role}
                onPin={togglePin}
              />
            )}
            {rest.length > 0 && (
              <NoteSection
                label={pinned.length > 0 ? "Toutes les notes" : undefined}
                notes={rest}
                role={role}
                onPin={togglePin}
              />
            )}
          </>
        )}
      </div>
    </ScreenContainer>
  );
}

function NoteSection({
  label,
  notes,
  role,
  onPin,
}: {
  label?: string;
  notes: DemoNote[];
  role: string;
  onPin: (n: DemoNote) => void;
}) {
  return (
    <div>
      {label && (
        <p className="text-text-muted mb-2 text-[11px] font-semibold tracking-widest uppercase">
          {label}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {notes.map((n) => (
          <div
            key={n.id}
            className={cn(
              "border-surface-border bg-surface flex flex-col rounded-xl border border-l-[3px] p-4",
              NOTE_BORDER[n.color],
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-text-primary text-sm font-semibold">
                {n.title}
              </h3>
              <button
                onClick={() => onPin(n)}
                aria-label={n.pinned ? "Désépingler" : "Épingler"}
                title={n.pinned ? "Désépingler" : "Épingler"}
                className={cn(
                  "flex-shrink-0 rounded-lg p-1 transition-colors",
                  n.pinned
                    ? "text-amber"
                    : "text-text-disabled hover:text-amber",
                )}
              >
                <Pin
                  size={13}
                  style={n.pinned ? { fill: "currentColor" } : {}}
                />
              </button>
            </div>
            <p className="text-text-secondary mt-1.5 line-clamp-3 text-xs leading-relaxed">
              {n.content}
            </p>
            <div className="text-2xs text-text-muted mt-3 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1">
                {n.scope === "privee" ? "Note perso" : n.authorName}
                {n.authorRole === role && n.scope === "equipe" && " · moi"}
              </span>
              <span suppressHydrationWarning>
                {formatRelativeTime(n.updatedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
