"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronRight,
  File,
  FileText,
  Folder,
  Grid,
  Home,
  Image as ImageIcon,
  List,
  Lock,
  Search,
  Upload,
  FolderPlus,
} from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Button } from "@/aurantir-front-kit";
import { formatRelativeTime } from "@/aurantir-front-kit/lib/utils";
import { useSession } from "@/lib/store/session";
import {
  getLibrary,
  formatFileSize,
  type FileKind,
  type LibraryFolder,
} from "@/lib/api/library";
import { toast } from "@/lib/toast";

const FILE_ICON: Record<FileKind, ReactNode> = {
  pdf: <FileText size={14} className="text-red" />,
  doc: <FileText size={14} className="text-blue" />,
  xls: <FileText size={14} className="text-green" />,
  img: <ImageIcon size={14} className="text-violet" />,
  autre: <File size={14} className="text-text-muted" />,
};

export function BibliothequeScreen() {
  const { role } = useSession();
  const folders = useMemo(() => getLibrary(role), [role]);
  const [open, setOpen] = useState<LibraryFolder | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const shownFolders = open
    ? []
    : folders.filter((f) => !q || f.name.toLowerCase().includes(q));
  const shownFiles = open
    ? open.files.filter((f) => !q || f.name.toLowerCase().includes(q))
    : [];
  const empty = shownFolders.length === 0 && shownFiles.length === 0;

  return (
    <ScreenContainer>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bibliothèque</h1>
          <p className="page-subtitle">Ressources et documents partagés</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<FolderPlus size={14} />}
            onClick={() =>
              toast.info("Nouveau dossier", "Fonction de démonstration")
            }
          >
            Nouveau dossier
          </Button>
          <Button
            size="sm"
            icon={<Upload size={14} />}
            onClick={() =>
              toast.success("Fichier uploadé", "Fonction de démonstration")
            }
          >
            Uploader
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            size={14}
            className="text-text-muted absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher un dossier ou un fichier"
            className="input w-full py-1.5 pl-9 text-sm"
          />
        </div>
        <div className="border-surface-border flex items-center overflow-hidden rounded-lg border">
          <button
            onClick={() => setView("grid")}
            aria-label="Vue grille"
            className={`p-1.5 transition-colors ${view === "grid" ? "bg-surface text-text-primary" : "text-text-muted hover:text-text-primary"}`}
          >
            <Grid size={14} />
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="Vue liste"
            className={`p-1.5 transition-colors ${view === "list" ? "bg-surface text-text-primary" : "text-text-muted hover:text-text-primary"}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="text-text-muted no-scrollbar mt-3 flex items-center gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setOpen(null)}
          className="hover:text-blue flex flex-shrink-0 items-center gap-1 transition-colors"
        >
          <Home size={12} /> Bibliothèque
        </button>
        {open && (
          <span className="flex flex-shrink-0 items-center gap-1">
            <ChevronRight size={10} />
            <span className="text-text-primary font-medium">{open.name}</span>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="mt-4 space-y-6">
        {/* Dossiers (racine) */}
        {shownFolders.length > 0 && (
          <div>
            <p className="text-text-muted mb-3 text-xs font-medium">
              Dossiers ({shownFolders.length})
            </p>
            {view === "grid" ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {shownFolders.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setOpen(d)}
                    className="border-surface-border bg-surface hover:border-blue/30 hover:bg-surface-hover flex flex-col gap-2 rounded-xl border p-4 text-left transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <Folder
                        size={22}
                        className="text-blue"
                        fill="currentColor"
                        fillOpacity={0.12}
                      />
                      {d.protege && (
                        <Lock size={12} className="text-text-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-text-primary truncate text-sm font-semibold">
                        {d.name}
                      </p>
                      <p className="text-2xs text-text-muted truncate">
                        {d.files.length} fichier
                        {d.files.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Fichiers</th>
                      <th>Protection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownFolders.map((d) => (
                      <tr
                        key={d.id}
                        className="cursor-pointer"
                        onClick={() => setOpen(d)}
                      >
                        <td className="flex items-center gap-2">
                          <Folder size={14} className="text-blue" />
                          <span className="text-text-primary text-sm">
                            {d.name}
                          </span>
                        </td>
                        <td className="text-text-muted text-xs">
                          {d.files.length}
                        </td>
                        <td>
                          {d.protege ? (
                            <span className="badge badge-amber">Protégé</span>
                          ) : (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Fichiers (dans un dossier) */}
        {shownFiles.length > 0 && (
          <div>
            <p className="text-text-muted mb-3 text-xs font-medium">
              Fichiers ({shownFiles.length})
            </p>
            {view === "grid" ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                {shownFiles.map((f) => (
                  <div
                    key={f.id}
                    className="border-surface-border bg-surface flex flex-col gap-2 rounded-xl border p-3"
                  >
                    <div className="bg-surface2 flex h-16 items-center justify-center rounded-lg">
                      {FILE_ICON[f.kind]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-text-primary truncate text-xs font-medium">
                        {f.name}
                      </p>
                      <p className="text-2xs text-text-muted">
                        {formatFileSize(f.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Type</th>
                      <th>Taille</th>
                      <th>Uploadé par</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownFiles.map((f) => (
                      <tr key={f.id}>
                        <td className="flex items-center gap-2">
                          {FILE_ICON[f.kind]}
                          <span className="text-text-primary text-sm">
                            {f.name}
                          </span>
                        </td>
                        <td>
                          <span className="text-text-muted text-xs uppercase">
                            {f.kind}
                          </span>
                        </td>
                        <td className="text-text-muted text-xs">
                          {formatFileSize(f.size)}
                        </td>
                        <td className="text-text-muted text-xs">
                          {f.uploader}
                        </td>
                        <td
                          className="text-text-muted text-xs"
                          suppressHydrationWarning
                        >
                          {formatRelativeTime(f.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Vide */}
        {empty && (
          <div className="text-text-muted py-16 text-center">
            <Folder size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{q ? "Aucun résultat" : "Dossier vide"}</p>
          </div>
        )}
      </div>
    </ScreenContainer>
  );
}
