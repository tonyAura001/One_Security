"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  uploadAttachment,
  fetchAttachments,
  getSignedUrl,
  deleteAttachment,
  type FichierEntite,
} from "@/lib/supabase/data/files";

function fmtSize(b: number | null): string {
  if (!b) return "";
  if (b < 1024) return `${b} o`;
  if (b < 1_048_576) return `${Math.round(b / 1024)} Ko`;
  return `${(b / 1_048_576).toFixed(1)} Mo`;
}

const denied = (e: unknown) =>
  /policy|security|permission|denied|violates/i.test(String(e));

/**
 * Pièces jointes réutilisables pour n'importe quelle entité métier (projet,
 * ticket, client…). Upload → Storage privé, visualisation par URL signée.
 */
export function AttachmentsPanel({
  entite,
  idEntite,
  title = "Pièces jointes",
}: {
  entite: FichierEntite;
  idEntite: string;
  title?: string;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const key = ["attachments", entite, idEntite];

  const { data: files } = useQuery({
    queryKey: key,
    queryFn: () => fetchAttachments(entite, idEntite),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadAttachment(entite, idEntite, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Fichier ajouté");
    },
    onError: (e) =>
      toast.error(denied(e) ? "Upload refusé (accès requis)." : "Échec de l'upload."),
  });

  const delMut = useMutation({
    mutationFn: (f: { id: string; chemin: string }) => deleteAttachment(f.id, f.chemin),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Fichier supprimé");
    },
    onError: () => toast.error("Suppression refusée."),
  });

  async function openFile(chemin: string) {
    try {
      const url = await getSignedUrl(chemin);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Accès au fichier refusé.");
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-muted flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.4px] uppercase">
          <Paperclip className="size-3.5" /> {title}
        </span>
        <Button
          size="xs"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploadMut.isPending}
        >
          <Upload className="size-3.5" strokeWidth={2.2} />
          {uploadMut.isPending ? "Envoi…" : "Ajouter"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMut.mutate(f);
            e.target.value = "";
          }}
        />
      </div>

      {files && files.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {files.map((f) => (
            <div
              key={f.id}
              className="border-border bg-surface flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
            >
              <Paperclip className="text-muted size-3.5 flex-none" />
              <span className="text-foreground min-w-0 flex-1 truncate text-[12px] font-semibold">
                {f.nom}
              </span>
              <span className="text-muted flex-none text-[10.5px]">{fmtSize(f.taille)}</span>
              <button
                type="button"
                onClick={() => openFile(f.chemin)}
                className="text-accent hover:bg-accent/10 flex-none rounded p-1"
                aria-label="Télécharger"
              >
                <Download className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => delMut.mutate({ id: f.id, chemin: f.chemin })}
                className="text-muted flex-none rounded p-1 hover:bg-red-500/10 hover:text-red-500"
                aria-label="Supprimer"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted text-[11.5px]">Aucun fichier joint.</p>
      )}
    </div>
  );
}
