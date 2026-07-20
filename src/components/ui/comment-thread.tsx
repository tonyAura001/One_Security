"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import {
  fetchCommentaires,
  addCommentaire,
  type EntiteCommentaire,
} from "@/lib/supabase/data/commentaires";

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/** Fil de commentaires réutilisable, attaché à une entité métier. */
export function CommentThread({
  entite,
  idEntite,
}: {
  entite: EntiteCommentaire;
  idEntite: string;
}) {
  const qc = useQueryClient();
  const key = ["commentaires", entite, idEntite];
  const [text, setText] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchCommentaires(entite, idEntite),
  });

  const post = useMutation({
    mutationFn: (contenu: string) => addCommentaire(entite, idEntite, contenu),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      setText("");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Commentaire non publié : ${msg}`);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (t) post.mutate(t);
  }

  return (
    <div>
      <div className="text-foreground mb-3 flex items-center gap-2 text-[14px] font-extrabold tracking-[-0.2px]">
        <MessageSquare className="size-4" />
        Commentaires
        <span className="text-muted text-[12px] font-bold">{comments.length}</span>
      </div>

      <div className="mb-3 flex flex-col gap-3">
        {isLoading && <p className="text-muted text-[12.5px] font-semibold">Chargement…</p>}
        {!isLoading && comments.length === 0 && (
          <p className="text-muted text-[12.5px] font-semibold">
            Aucun commentaire pour le moment.
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <span
              className={cn(
                "flex size-8 flex-none items-center justify-center rounded-full text-[10px] font-bold",
                c.mine ? "bg-accent text-white" : "bg-active text-accent",
              )}
            >
              {initials(c.auteur)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-foreground text-[12.5px] font-bold">{c.auteur}</span>
                <span className="text-muted text-[10.5px] font-semibold">
                  {formatRelative(c.date)}
                </span>
              </div>
              <p className="text-foreground/90 mt-0.5 text-[13px] leading-[1.45] whitespace-pre-wrap">
                {c.contenu}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ajouter un commentaire…"
          aria-label="Nouveau commentaire"
          className="border-border bg-surface2 text-foreground focus:border-accent/50 flex-1 rounded-[10px] border px-3 py-2 text-[13px] font-semibold outline-none"
        />
        <Button type="submit" size="sm" disabled={!text.trim() || post.isPending}>
          <Send className="size-4" />
          {post.isPending ? "…" : "Publier"}
        </Button>
      </form>
    </div>
  );
}
