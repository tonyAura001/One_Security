"use client";

import { useState } from "react";
import { Building2, Database, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Section = "entreprise" | "membres" | "securite" | "donnees";

const NAV: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "entreprise", label: "Entreprise", icon: Building2 },
  { id: "membres", label: "Membres & rôles", icon: Users },
  { id: "securite", label: "Sécurité", icon: ShieldCheck },
  { id: "donnees", label: "Données", icon: Database },
];

const COMPANY_ROWS: { label: string; value: string; accent?: boolean }[] = [
  { label: "NINEA", value: "005 812 447 2G3" },
  { label: "Registre de commerce", value: "SN-DKR-2019-B-4821" },
  { label: "Format de numérotation", value: "FAC-2025-XXX" },
  { label: "Devise", value: "Franc CFA (XOF)" },
  { label: "Thème par défaut", value: "Sombre", accent: true },
  { label: "Signature numérique", value: "M. Diallo · activée" },
];

interface Member {
  role: string;
  holder: string;
  status: "actif" | "invite";
}

const MEMBERS: Member[] = [
  { role: "Directeur Général", holder: "M. Diallo", status: "actif" },
  { role: "Comptable", holder: "Awa Ndiaye", status: "actif" },
  { role: "Secrétaire", holder: "Bineta Fall", status: "actif" },
  { role: "Recruteur", holder: "Modou Sy", status: "actif" },
  { role: "Responsable Paie", holder: "Sokhna Mbaye", status: "actif" },
  { role: "Chef de contrôle", holder: "Pape Diouf", status: "actif" },
  { role: "Community Manager", holder: "Aïda Ka", status: "actif" },
  { role: "Mainteneur", holder: "Lamine Faye", status: "invite" },
  { role: "Caissier", holder: "Awa N.", status: "actif" },
];

const MEMBER_STATUS: Record<
  Member["status"],
  { variant: PillVariant; label: string }
> = {
  actif: { variant: "success", label: "Actif" },
  invite: { variant: "warning", label: "Invité" },
};

export function SharedParametres() {
  const [section, setSection] = useState<Section>("entreprise");

  return (
    <ScreenContainer>
      <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-[240px_1fr] lg:items-start">
        {/* Settings nav */}
        <Card className="flex flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = item.id === section;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[12.5px] font-bold transition-colors",
                  active
                    ? "bg-accent/14 text-accent"
                    : "text-muted hover:bg-hover hover:text-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={1.8} />
                {item.label}
              </button>
            );
          })}
        </Card>

        {/* Right panel */}
        <div>
          {section === "entreprise" && <EntreprisePanel />}
          {section === "membres" && <MembresPanel />}
          {section === "securite" && <SecuritePanel />}
          {section === "donnees" && <DonneesPanel />}
        </div>
      </div>
    </ScreenContainer>
  );
}

function EntreprisePanel() {
  return (
    <Card className="p-[20px]">
      <div className="text-foreground mb-4 text-[15px] font-extrabold tracking-[-0.3px]">
        Configuration de l&apos;entreprise
      </div>
      <div className="border-border mb-4 flex items-center gap-3 border-b pb-4">
        <span className="bg-accent flex size-[52px] flex-none items-center justify-center rounded-[14px] text-white">
          <Building2 className="size-6" strokeWidth={1.8} />
        </span>
        <div>
          <div className="text-foreground text-[15px] font-extrabold">
            Dakar Sécurité SARL
          </div>
          <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
            Sécurité privée · Dakar, Sénégal
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        {COMPANY_ROWS.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3"
          >
            <span className="text-muted text-[12.5px] font-semibold">
              {row.label}
            </span>
            <span
              className={cn(
                "text-[12.5px] font-bold",
                row.accent ? "text-accent" : "text-foreground",
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        className="mt-[18px] w-full"
        onClick={() => toast.info("Édition de la configuration ouverte")}
      >
        Modifier la configuration
      </Button>
    </Card>
  );
}

function MembresPanel() {
  return (
    <Card className="p-[20px]">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
          Gestion des utilisateurs &amp; rôles
        </div>
        <span className="text-muted text-[11px] font-bold">
          {MEMBERS.length} rôles
        </span>
      </div>

      <div className="border-border text-muted flex items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px] uppercase">
        <div className="flex-[1.2]">Rôle</div>
        <div className="flex-[1.2]">Titulaire</div>
        <div className="w-[90px] text-right">Statut</div>
      </div>

      {MEMBERS.map((member, i) => {
        const meta = MEMBER_STATUS[member.status];
        return (
          <div
            key={member.role}
            className={cn(
              "flex items-center gap-3.5 px-1 py-3",
              i < MEMBERS.length - 1 && "border-border border-b",
            )}
          >
            <div className="text-foreground flex-[1.2] text-[12.5px] font-bold">
              {member.role}
            </div>
            <div className="text-muted flex-[1.2] text-[12px] font-semibold">
              {member.holder}
            </div>
            <div className="flex w-[90px] justify-end">
              <StatusPill variant={meta.variant} uppercase>
                {meta.label}
              </StatusPill>
            </div>
          </div>
        );
      })}

      <Button
        className="mt-4"
        size="sm"
        onClick={() => toast.success("Invitation d'un nouveau membre lancée")}
      >
        Inviter un membre
      </Button>
    </Card>
  );
}

interface SecurityToggle {
  id: string;
  title: string;
  detail: string;
  enabled: boolean;
}

function SecuritePanel() {
  const [toggles, setToggles] = useState<SecurityToggle[]>([
    {
      id: "2fa",
      title: "Double authentification (2FA)",
      detail: "Vérification par code à chaque connexion",
      enabled: true,
    },
    {
      id: "sessions",
      title: "Déconnexion automatique des sessions",
      detail: "Fermeture après 30 min d'inactivité",
      enabled: true,
    },
    {
      id: "logs",
      title: "Journalisation des accès",
      detail: "Historique des connexions et actions sensibles",
      enabled: false,
    },
  ]);

  const toggle = (id: string) => {
    setToggles((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = !t.enabled;
        toast.info(`${t.title} — ${next ? "activée" : "désactivée"}`);
        return { ...t, enabled: next };
      }),
    );
  };

  return (
    <Card className="p-[20px]">
      <div className="text-foreground mb-4 text-[15px] font-extrabold tracking-[-0.3px]">
        Sécurité &amp; accès
      </div>
      <div className="flex flex-col gap-2.5">
        {toggles.map((t) => (
          <div
            key={t.id}
            className="border-border bg-surface2 flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
          >
            <div className="min-w-0">
              <div className="text-foreground text-[13px] font-bold">
                {t.title}
              </div>
              <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
                {t.detail}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={t.enabled}
              aria-label={t.title}
              onClick={() => toggle(t.id)}
              className={cn(
                "relative h-6 w-11 flex-none rounded-full transition-colors",
                t.enabled ? "bg-accent" : "bg-surface2 border-border border",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all",
                  t.enabled ? "left-[22px]" : "left-0.5",
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DonneesPanel() {
  const actions: {
    title: string;
    detail: string;
    label: string;
    variant: "default" | "outline" | "destructive";
    onClick: () => void;
  }[] = [
    {
      title: "Export des données",
      detail: "Télécharger l'ensemble des données au format CSV / Excel",
      label: "Exporter",
      variant: "default",
      onClick: () => toast.success("Export des données lancé"),
    },
    {
      title: "Conformité APDP",
      detail: "Registre de traitement des données personnelles (Sénégal)",
      label: "Consulter",
      variant: "outline",
      onClick: () => toast.info("Registre APDP ouvert"),
    },
    {
      title: "Sauvegarde automatique",
      detail: "Dernière sauvegarde le 03/07/2026 · quotidienne",
      label: "Sauvegarder",
      variant: "outline",
      onClick: () => toast.success("Sauvegarde manuelle déclenchée"),
    },
    {
      title: "Purge des données",
      detail: "Suppression définitive des données archivées",
      label: "Purger",
      variant: "destructive",
      onClick: () => toast.warning("Confirmation requise pour la purge"),
    },
  ];

  return (
    <Card className="p-[20px]">
      <div className="text-foreground mb-4 text-[15px] font-extrabold tracking-[-0.3px]">
        Données &amp; conformité
      </div>
      <div className="flex flex-col gap-2.5">
        {actions.map((a) => (
          <div
            key={a.title}
            className="border-border bg-surface2 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
          >
            <div className="min-w-0">
              <div className="text-foreground text-[13px] font-bold">
                {a.title}
              </div>
              <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
                {a.detail}
              </div>
            </div>
            <Button size="sm" variant={a.variant} onClick={a.onClick}>
              {a.label}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
