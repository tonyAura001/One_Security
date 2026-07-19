"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, MapPin, Users, Calendar, Video, Phone } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { formatDateFR, formatFCFACompact } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  fetchPostes,
  fetchCandidatures,
  fetchEntretiens,
  updateCandidatureStatut,
  type CandidatureStatut,
} from "@/lib/supabase/data/recrutement";

const POSTE_STATUT: Record<string, { variant: PillVariant; label: string }> = {
  ouvert: { variant: "success", label: "Ouvert" },
  pourvu: { variant: "info", label: "Pourvu" },
  ferme: { variant: "neutral", label: "Fermé" },
};

const CAND_STATUT: Record<CandidatureStatut, { variant: PillVariant; label: string }> = {
  nouveau: { variant: "neutral", label: "Nouveau" },
  preselection: { variant: "info", label: "Présélection" },
  entretien: { variant: "violet", label: "Entretien" },
  offre: { variant: "warning", label: "Offre" },
  embauche: { variant: "success", label: "Embauché" },
  refuse: { variant: "danger", label: "Refusé" },
};

const ENT_STATUT: Record<string, { variant: PillVariant; label: string }> = {
  planifie: { variant: "info", label: "Planifié" },
  realise: { variant: "success", label: "Réalisé" },
  annule: { variant: "danger", label: "Annulé" },
};

const ENT_TYPE_ICON = { telephonique: Phone, visio: Video, physique: Calendar };

const STATUT_OPTIONS: CandidatureStatut[] = [
  "nouveau",
  "preselection",
  "entretien",
  "offre",
  "embauche",
  "refuse",
];

export function RecrutementScreen() {
  const qc = useQueryClient();
  const [posteId, setPosteId] = useState<string | null>(null);
  const [candidatureId, setCandidatureId] = useState<string | null>(null);

  const postesQ = useQuery({ queryKey: ["postes"], queryFn: fetchPostes });
  const postes = postesQ.data ?? [];
  const activePoste = posteId ?? postes[0]?.id ?? null;

  const candQ = useQuery({
    queryKey: ["candidatures", activePoste],
    queryFn: () => fetchCandidatures(activePoste!),
    enabled: !!activePoste,
  });
  const candidatures = candQ.data ?? [];

  const entQ = useQuery({
    queryKey: ["entretiens", candidatureId],
    queryFn: () => fetchEntretiens(candidatureId!),
    enabled: !!candidatureId,
  });

  const statutMut = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: CandidatureStatut }) =>
      updateCandidatureStatut(id, statut),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidatures", activePoste] });
      toast.success("Statut de la candidature mis à jour");
    },
    onError: () =>
      toast.error("Modification refusée (réservé à l'équipe recrutement)"),
  });

  return (
    <ScreenContainer>
      <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-[1fr_1.4fr]">
        {/* ── Postes à pourvoir ── */}
        <Card className="flex flex-col gap-2 p-3">
          <div className="text-muted mb-1 text-[11px] font-bold tracking-[0.6px] uppercase">
            Postes à pourvoir · {postes.length}
          </div>
          {postes.map((p) => {
            const active = p.id === activePoste;
            const meta = POSTE_STATUT[p.statut];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPosteId(p.id);
                  setCandidatureId(null);
                }}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-accent/40 bg-accent/[0.06]"
                    : "border-border bg-surface2 hover:bg-hover",
                )}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="text-accent size-4 flex-none" strokeWidth={2.2} />
                  <span className="text-foreground flex-1 truncate text-[13px] font-extrabold">
                    {p.titre}
                  </span>
                  <StatusPill variant={meta.variant} uppercase>
                    {meta.label}
                  </StatusPill>
                </div>
                <div className="text-muted flex items-center gap-3 text-[11px] font-semibold">
                  <span className="rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
                    {p.typeContrat}
                  </span>
                  {p.lieu && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" /> {p.lieu}
                    </span>
                  )}
                  {p.salaireMin != null && (
                    <span>
                      {formatFCFACompact(p.salaireMin)}
                      {p.salaireMax != null ? `–${formatFCFACompact(p.salaireMax)}` : ""}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1 font-bold">
                    <Users className="size-3" /> {p.nbCandidatures}
                  </span>
                </div>
              </button>
            );
          })}
          {postesQ.isSuccess && postes.length === 0 && (
            <p className="text-muted py-6 text-center text-sm">Aucun poste ouvert</p>
          )}
        </Card>

        {/* ── Candidatures du poste ── */}
        <Card className="flex flex-col gap-2 p-3">
          <div className="text-muted mb-1 text-[11px] font-bold tracking-[0.6px] uppercase">
            Candidatures · {candidatures.length}
          </div>
          {candidatures.map((c) => {
            const meta = CAND_STATUT[c.statut];
            const open = c.id === candidatureId;
            return (
              <div
                key={c.id}
                className="border-border bg-surface2 rounded-xl border p-3"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCandidatureId(open ? null : c.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="text-foreground truncate text-[13px] font-extrabold">
                      {c.candidat.prenom} {c.candidat.nom}
                    </div>
                    <div className="text-muted text-[11px] font-semibold">
                      {c.candidat.email ?? "—"} · postulé le{" "}
                      {formatDateFR(c.datePostulation)}
                    </div>
                  </button>
                  <StatusPill variant={meta.variant} uppercase>
                    {meta.label}
                  </StatusPill>
                  <select
                    value={c.statut}
                    onChange={(e) =>
                      statutMut.mutate({
                        id: c.id,
                        statut: e.target.value as CandidatureStatut,
                      })
                    }
                    className="border-border bg-surface text-foreground focus:border-accent/50 rounded-[8px] border px-1.5 py-1 text-[11px] font-bold outline-none"
                    aria-label="Changer le statut"
                  >
                    {STATUT_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {CAND_STATUT[s].label}
                      </option>
                    ))}
                  </select>
                </div>

                {open && (
                  <div className="border-border mt-3 border-t pt-3">
                    <div className="text-muted mb-2 text-[10.5px] font-bold tracking-[0.4px] uppercase">
                      Entretiens
                    </div>
                    {entQ.isLoading && (
                      <p className="text-muted text-[12px]">Chargement…</p>
                    )}
                    {entQ.isSuccess && entQ.data.length === 0 && (
                      <p className="text-muted text-[12px]">
                        Aucun entretien (ou non visible selon votre rôle).
                      </p>
                    )}
                    <div className="flex flex-col gap-2">
                      {entQ.data?.map((e) => {
                        const Icon = ENT_TYPE_ICON[e.type];
                        const st = ENT_STATUT[e.statut];
                        return (
                          <div
                            key={e.id}
                            className="border-border bg-surface flex items-start gap-2.5 rounded-lg border p-2.5"
                          >
                            <Icon className="text-accent mt-0.5 size-3.5 flex-none" />
                            <div className="min-w-0 flex-1">
                              <div className="text-foreground text-[12px] font-bold">
                                {formatDateFR(e.dateHeure)} ·{" "}
                                {new Date(e.dateHeure).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              <div className="text-muted text-[11px] font-semibold">
                                {e.type} · recruteur {e.recruteur}
                              </div>
                              {e.compteRendu && (
                                <div className="text-muted mt-1 text-[11.5px]">
                                  {e.compteRendu}
                                </div>
                              )}
                            </div>
                            <StatusPill variant={st.variant} uppercase>
                              {st.label}
                            </StatusPill>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {candQ.isSuccess && candidatures.length === 0 && (
            <p className="text-muted py-6 text-center text-sm">
              Aucune candidature pour ce poste
            </p>
          )}
        </Card>
      </div>
    </ScreenContainer>
  );
}
