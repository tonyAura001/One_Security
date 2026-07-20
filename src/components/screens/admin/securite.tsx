"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusPill } from "@/components/ui/status-pill";
import { formatRelative } from "@/lib/format";
import { fetchNotifications } from "@/lib/supabase/data/notifications";
import { fetchDocumentAccessLog } from "@/lib/supabase/data/documents";

const POSTURE: { title: string; detail: string }[] = [
  { title: "Isolation des données (RLS)", detail: "Activée sur 100 % des tables — accès filtré par rôle" },
  { title: "Chiffrement en transit (TLS/HSTS)", detail: "HTTPS forcé, HSTS 2 ans + preload" },
  { title: "En-têtes de sécurité HTTP", detail: "X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy" },
  { title: "Authentification", detail: "Sessions Supabase (JWT ES256), rôle porté par app_metadata" },
  { title: "Tâches planifiées verrouillées", detail: "Fonctions cron exécutables par le seul service_role" },
];

const ACTION_LABEL: Record<string, string> = {
  open: "Ouverture",
  denied: "Accès refusé",
  permissions: "Permissions modifiées",
  create: "Création",
  update: "Modification",
  delete: "Suppression",
};

export function SecuriteScreen() {
  const { data: activity = [] } = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications });
  const { data: docLog = [] } = useQuery({
    queryKey: ["doc-access-log"],
    queryFn: () => fetchDocumentAccessLog(60),
  });
  const denied = docLog.filter((l) => !l.allowed).length;

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sécurité &amp; audit</h1>
          <p className="page-subtitle">Posture de sécurité et activité récente</p>
        </div>
      </div>

      <Card className="mt-4 p-[18px_20px]">
        <div className="text-foreground mb-3.5 flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.3px]">
          <ShieldCheck className="size-4" /> Posture de sécurité
        </div>
        <div className="flex flex-col gap-2.5">
          {POSTURE.map((p) => (
            <div key={p.title} className="border-border bg-surface2 flex items-start gap-3 rounded-xl border px-4 py-3">
              <CheckCircle2 className="text-success mt-0.5 size-4 flex-none" />
              <div>
                <div className="text-foreground text-[13px] font-bold">{p.title}</div>
                <div className="text-muted mt-0.5 text-[11.5px] font-semibold">{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-[18px_20px]">
        <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
          Activité récente
        </div>
        {activity.length === 0 ? (
          <p className="text-muted text-[12.5px] font-semibold">Aucune activité récente.</p>
        ) : (
          <div className="flex flex-col">
            {activity.slice(0, 12).map((a, i) => (
              <div key={a.id} className={`flex items-center gap-3.5 py-3 ${i < Math.min(activity.length, 12) - 1 ? "border-border border-b" : ""}`}>
                <IconTile icon={ShieldCheck} tone={a.tone === "danger" ? "danger" : a.tone === "warning" ? "warning" : "accent"} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-foreground text-[12.5px] font-bold">{a.title}</div>
                  <div className="text-muted mt-0.5 text-[11px] font-semibold">{a.detail} · {formatRelative(a.at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4 p-[18px_20px]">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div className="text-foreground flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.3px]">
            <FileText className="size-4" /> Journal d&apos;accès aux documents
          </div>
          {denied > 0 && (
            <StatusPill variant="danger" uppercase>
              {denied} refus
            </StatusPill>
          )}
        </div>
        {docLog.length === 0 ? (
          <p className="text-muted text-[12.5px] font-semibold">Aucun événement enregistré.</p>
        ) : (
          <div className="flex flex-col">
            {docLog.slice(0, 30).map((l, i) => (
              <div
                key={l.id}
                className={`flex items-center gap-3 py-2.5 ${i < Math.min(docLog.length, 30) - 1 ? "border-border border-b" : ""}`}
              >
                <span className={`size-2 flex-none rounded-full ${l.allowed ? "bg-success" : "bg-danger"}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-foreground text-[12.5px] font-bold">
                    {ACTION_LABEL[l.action] ?? l.action}
                    {l.detail ? ` · ${l.detail}` : ""}
                  </div>
                  <div className="text-muted text-[10.5px] font-semibold">{formatRelative(l.createdAt)}</div>
                </div>
                {!l.allowed && (
                  <StatusPill variant="danger" uppercase>
                    refusé
                  </StatusPill>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </ScreenContainer>
  );
}
