"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlignLeft, Bold, Italic, List, Underline } from "lucide-react";
import type { ReactNode } from "react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { ONE_SECURITY } from "@/lib/one-security";
import { formatDateFR } from "@/lib/format";
import { fetchClientOptions, fetchSiteOptions } from "@/lib/supabase/data/options";
import { createContract } from "@/lib/supabase/data/contracts";

/** Highlighted substituted value inside the paper contract. */
function Var({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[5px] bg-[#2D6BFF]/16 px-1.5 py-px font-extrabold text-[#1E5AE6]">
      {children}
    </span>
  );
}

const TOOLBAR = [
  { key: "bold", label: "Gras", icon: Bold },
  { key: "italic", label: "Italique", icon: Italic },
  { key: "underline", label: "Souligné", icon: Underline },
] as const;

const inputCls =
  "border-border bg-surface2 text-foreground focus-visible:border-accent mt-1 w-full rounded-lg border px-2.5 py-2 text-[12px] font-bold outline-none";

export function SecretaireContratEditor() {
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["client-options"], queryFn: fetchClientOptions });
  const { data: sites = [] } = useQuery({ queryKey: ["site-options"], queryFn: fetchSiteOptions });

  const [clientId, setClientId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [nbAgents, setNbAgents] = useState("8");
  const [dateDebut, setDateDebut] = useState("");
  const [dureeMois, setDureeMois] = useState("12");
  const [montant, setMontant] = useState("3200000");

  const clientLabel = clients.find((c) => c.id === clientId)?.label ?? "…";
  const siteLabel = sites.find((s) => s.id === siteId)?.label ?? "…";
  const montantNum = Number(montant.replace(/\s/g, "")) || 0;

  const gen = useMutation({
    mutationFn: () => {
      const dureeM = Math.max(1, Number(dureeMois) || 12);
      const fin = dateDebut
        ? new Date(new Date(dateDebut).setMonth(new Date(dateDebut).getMonth() + dureeM))
            .toISOString()
            .slice(0, 10)
        : null;
      return createContract({
        clientId,
        siteId,
        type: "PRESTATION",
        montantHT: montantNum,
        tauxTVA: 18,
        frequenceFacturation: "MENSUELLE",
        dateSignature: new Date().toISOString().slice(0, 10),
        dateDebut,
        dateFin: fin,
        description: `Gardiennage du site ${siteLabel} par ${nbAgents} agents, ${dureeMois} mois.`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contrat généré et enregistré");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(/row-level|refus/i.test(msg) ? "Accès refusé (DG/RP/RF)." : `Échec : ${msg}`);
    },
  });

  const valid = clientId !== "" && siteId !== "" && dateDebut !== "" && montantNum > 0;

  return (
    <ScreenContainer>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_260px]">
        <Card className="overflow-hidden rounded-2xl">
          <div className="border-border bg-surface2 flex items-center gap-1 border-b px-3.5 py-2.5">
            {TOOLBAR.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                className="text-foreground hover:bg-hover flex size-8 items-center justify-center rounded-[7px]"
              >
                <Icon className="size-4" strokeWidth={2} />
              </button>
            ))}
            <div className="bg-border mx-1.5 h-5 w-px" />
            <button type="button" aria-label="Liste à puces" className="text-muted hover:bg-hover flex size-8 items-center justify-center rounded-[7px]">
              <List className="size-4" strokeWidth={1.8} />
            </button>
            <button type="button" aria-label="Alignement" className="text-muted hover:bg-hover flex size-8 items-center justify-center rounded-[7px]">
              <AlignLeft className="size-4" strokeWidth={1.8} />
            </button>
            <div className="text-muted ml-auto text-[11px] font-bold">
              Contrat de prestation · modèle standard
            </div>
          </div>

          <div className="m-4 rounded-lg bg-white px-[30px] py-[26px] text-[#0F1626] shadow-[0_6px_20px_rgba(0,0,0,0.15)]">
            <div className="mb-4 text-center text-[15px] font-extrabold">
              CONTRAT DE PRESTATION DE GARDIENNAGE
            </div>
            <p className="mb-3 text-[11.5px] leading-[1.7] font-semibold">
              Entre <Var>{ONE_SECURITY.name}</Var>, ci-après « le Prestataire », et{" "}
              <Var>{clientLabel}</Var>, ci-après « le Client ».
            </p>
            <p className="mb-3 text-[11.5px] leading-[1.7] font-semibold">
              <b>Article 1 — Objet.</b> Le Prestataire assure la surveillance et le
              gardiennage du site situé à <Var>{siteLabel}</Var>, par <Var>{nbAgents}</Var> agents.
            </p>
            <p className="mb-3 text-[11.5px] leading-[1.7] font-semibold">
              <b>Article 2 — Durée.</b> Le présent contrat prend effet le{" "}
              <Var>{dateDebut ? formatDateFR(dateDebut) : "…"}</Var> pour une durée de{" "}
              <Var>{dureeMois} mois</Var>.
            </p>
            <p className="text-[11.5px] leading-[1.7] font-semibold">
              <b>Article 3 — Rémunération.</b> En contrepartie, le Client verse la somme
              mensuelle de <Var>{montantNum.toLocaleString("fr-FR")}</Var> FCFA HT.
            </p>
          </div>
        </Card>

        <Card className="rounded-2xl px-[18px] py-4">
          <div className="text-muted mb-3.5 text-[11px] font-bold tracking-[0.5px]">
            VARIABLES DU MODÈLE
          </div>
          <div className="flex flex-col gap-3">
            <label className="block">
              <span className="text-muted text-[10.5px] font-semibold">client</span>
              <select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-muted text-[10.5px] font-semibold">site</span>
              <select className={inputCls} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-muted text-[10.5px] font-semibold">nb_agents</span>
              <input type="text" value={nbAgents} onChange={(e) => setNbAgents(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-muted text-[10.5px] font-semibold">date_debut</span>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-muted text-[10.5px] font-semibold">duree (mois)</span>
              <input type="text" value={dureeMois} onChange={(e) => setDureeMois(e.target.value.replace(/[^\d]/g, ""))} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-muted text-[10.5px] font-semibold">montant HT / mois</span>
              <input type="text" value={montant} onChange={(e) => setMontant(e.target.value.replace(/[^\d]/g, ""))} className={inputCls} />
            </label>
          </div>
          <Button
            className="mt-4 h-auto w-full rounded-[10px] py-[11px] text-[12.5px] font-extrabold"
            disabled={!valid || gen.isPending}
            onClick={() => gen.mutate()}
          >
            {gen.isPending ? "Génération…" : "Générer le contrat"}
          </Button>
          {!valid && (
            <p className="text-muted mt-2 text-center text-[10.5px] font-semibold">
              Client, site, date et montant requis.
            </p>
          )}
        </Card>
      </div>
    </ScreenContainer>
  );
}
