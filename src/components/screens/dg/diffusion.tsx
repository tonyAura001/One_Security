"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/lib/toast";
import { formatRelative } from "@/lib/format";
import { fetchContenus, createContenu } from "@/lib/supabase/data/contenu";

const AUDIENCES: { v: string; l: string }[] = [
  { v: "entreprise", l: "Toute l'entreprise" },
  { v: "encadrement", l: "Encadrement" },
  { v: "agents", l: "Agents de terrain" },
  { v: "siege", l: "Personnel du siège" },
];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function DiffusionScreen() {
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [audience, setAudience] = useState("entreprise");
  const [message, setMessage] = useState("");

  const { data: annonces = [] } = useQuery({
    queryKey: ["contenu", "annonce"],
    queryFn: () => fetchContenus("annonce"),
  });

  const send = useMutation({
    mutationFn: () =>
      createContenu({ type: "annonce", titre: subject, corps: message, categorie: audience }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contenu", "annonce"] });
      toast.success("Annonce diffusée");
      setSubject("");
      setMessage("");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Échec : ${msg}`);
    },
  });

  const valid = subject.trim() && message.trim();

  return (
    <ScreenContainer>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <div className="text-foreground mb-4 flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.3px]">
            <Megaphone className="size-4" /> Nouvelle annonce
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) send.mutate();
            }}
            className="flex flex-col gap-3.5"
          >
            <div>
              <label className={label}>Objet</label>
              <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex. Nouvelles consignes de sécurité" />
            </div>
            <div>
              <label className={label}>Audience</label>
              <select className={field} value={audience} onChange={(e) => setAudience(e.target.value)}>
                {AUDIENCES.map((a) => (
                  <option key={a.v} value={a.v}>{a.l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Message</label>
              <textarea className={`${field} min-h-[140px] resize-y`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Rédigez votre annonce…" />
            </div>
            <Button type="submit" disabled={!valid || send.isPending}>
              <Send className="size-4" />
              {send.isPending ? "Diffusion…" : "Diffuser l'annonce"}
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="text-muted mb-3 text-[11px] font-bold tracking-[0.6px]">
            ANNONCES RÉCENTES · {annonces.length}
          </div>
          {annonces.length === 0 ? (
            <p className="text-muted text-[12.5px] font-semibold">Aucune annonce diffusée.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {annonces.map((a) => (
                <div key={a.id} className="border-border bg-surface2 rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-foreground text-[12.5px] font-bold">{a.titre}</div>
                    <StatusPill variant="info" uppercase>
                      {AUDIENCES.find((x) => x.v === a.categorie)?.l ?? a.categorie ?? "—"}
                    </StatusPill>
                  </div>
                  {a.corps && (
                    <p className="text-muted mt-1 line-clamp-2 text-[11.5px] font-medium">{a.corps}</p>
                  )}
                  <div className="text-muted mt-1.5 text-[10.5px] font-semibold">
                    {a.auteur} · {formatRelative(a.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ScreenContainer>
  );
}
