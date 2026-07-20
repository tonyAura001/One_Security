"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Database,
  Download,
  KeyRound,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ONE_SECURITY } from "@/lib/one-security";
import { useSession } from "@/lib/store/session";
import { createClient } from "@/lib/supabase/client";
import { switchActiveRole } from "@/lib/supabase/data/admin-members";
import { ROLES, type RoleId } from "@/lib/rbac";
import { downloadCsv } from "@/lib/csv";
import {
  fetchParametres,
  saveParametres,
  PARAM_LABELS,
  COMPANY_FIELDS,
  type Parametres,
} from "@/lib/supabase/data/parametres";
import { fetchMembers, setMemberActif } from "@/lib/supabase/data/members";
import type { Member } from "@/lib/store/members";

type Section = "entreprise" | "membres" | "securite" | "donnees";

const NAV: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "entreprise", label: "Entreprise", icon: Building2 },
  { id: "membres", label: "Membres & rôles", icon: Users },
  { id: "securite", label: "Sécurité", icon: ShieldCheck },
  { id: "donnees", label: "Données", icon: Database },
];

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50 disabled:opacity-60";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function SharedParametres() {
  const [section, setSection] = useState<Section>("entreprise");

  return (
    <ScreenContainer>
      <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-[240px_1fr] lg:items-start">
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

// ── Entreprise : identité (éditable par DG/RP) + réglages, tout persisté ────

function EntreprisePanel() {
  const qc = useQueryClient();
  const { role } = useSession();
  const canEdit = role === "dg" || role === "rp";
  const { data } = useQuery({ queryKey: ["parametres"], queryFn: fetchParametres });
  const [form, setForm] = useState<Parametres>({});
  useEffect(() => {
    if (data) {
      // Pré-remplir l'identité avec les défauts du code si non encore enregistrée.
      const next: Parametres = { ...data };
      for (const f of COMPANY_FIELDS) if (next[f.cle] === undefined) next[f.cle] = f.defaut;
      setForm(next);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveParametres(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parametres"] });
      toast.success("Enregistré");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level|refusé|policy/i.test(msg)
          ? "Accès refusé (DG/RP requis)."
          : `Échec : ${msg}`,
      );
    },
  });
  const set = (cle: string, v: string) => setForm((f) => ({ ...f, [cle]: v }));

  return (
    <div className="flex flex-col gap-[15px]">
      <Card className="p-[20px]">
        <div className="text-foreground mb-4 text-[15px] font-extrabold tracking-[-0.3px]">
          Identité de l&apos;entreprise
        </div>
        <div className="border-border mb-4 flex items-center gap-3 border-b pb-4">
          <span className="bg-accent flex size-[52px] flex-none items-center justify-center rounded-[14px] text-white">
            <Building2 className="size-6" strokeWidth={1.8} />
          </span>
          <div>
            <div className="text-foreground text-[15px] font-extrabold">
              {form["entreprise_name"] || ONE_SECURITY.name}
            </div>
            <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
              {form["entreprise_slogan"] || ONE_SECURITY.slogan}
            </div>
          </div>
        </div>

        {canEdit ? (
          <div className="flex flex-col gap-3.5">
            {COMPANY_FIELDS.map((f) => (
              <div key={f.cle}>
                <label className={label}>{f.label}</label>
                {f.textarea ? (
                  <textarea
                    className={`${field} min-h-[54px] resize-y`}
                    value={form[f.cle] ?? ""}
                    onChange={(e) => set(f.cle, e.target.value)}
                  />
                ) : (
                  <input className={field} value={form[f.cle] ?? ""} onChange={(e) => set(f.cle, e.target.value)} />
                )}
              </div>
            ))}
            <Button className="mt-1 w-full" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Enregistrement…" : "Enregistrer l'identité"}
            </Button>
            <p className="text-muted text-[10.5px] font-medium">
              Ces informations alimentent les documents officiels (en-tête, pied, cachet).
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {COMPANY_FIELDS.map((f) => (
                <div key={f.cle} className="flex items-start justify-between gap-4">
                  <span className="text-muted flex-none text-[12.5px] font-semibold">{f.label}</span>
                  <span className="text-foreground text-right text-[12.5px] font-bold">{form[f.cle] || f.defaut}</span>
                </div>
              ))}
            </div>
            <p className="text-muted mt-3 text-[10.5px] font-medium">
              Modifiable par la Direction (DG) et les Responsables (RP).
            </p>
          </>
        )}
      </Card>

      <Card className="p-[20px]">
        <div className="text-foreground mb-4 text-[15px] font-extrabold tracking-[-0.3px]">
          Réglages applicatifs
        </div>
        <div className="flex flex-col gap-3.5">
          {PARAM_LABELS.map((p) => (
            <div key={p.cle}>
              <label className={label}>{p.label}</label>
              {p.cle === "theme_defaut" ? (
                <select
                  className={field}
                  value={form[p.cle] ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => setForm((f) => ({ ...f, [p.cle]: e.target.value }))}
                >
                  <option value="sombre">Sombre</option>
                  <option value="clair">Clair</option>
                </select>
              ) : (
                <input
                  className={field}
                  value={form[p.cle] ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => setForm((f) => ({ ...f, [p.cle]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
        {canEdit ? (
          <Button
            className="mt-[18px] w-full"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Enregistrement…" : "Enregistrer les réglages"}
          </Button>
        ) : (
          <p className="text-muted mt-4 text-[11.5px] font-semibold">
            Seuls la Direction (DG) et les Responsables (RP) peuvent modifier ces réglages.
          </p>
        )}
      </Card>
    </div>
  );
}

// ── Membres : liste réelle (table User) + activer/suspendre ─────────────────

function MembresPanel() {
  const qc = useQueryClient();
  const { role } = useSession();
  const canManage = role === "dg" || role === "rh";
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });

  const mut = useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) =>
      setMemberActif(id, actif),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Statut du membre mis à jour");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level|refusé|policy/i.test(msg)
          ? "Accès refusé (DG/RH requis)."
          : `Échec : ${msg}`,
      );
    },
  });

  return (
    <Card className="p-[20px]">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
          Membres &amp; rôles
        </div>
        <span className="text-muted text-[11px] font-bold">
          {members.length} membre{members.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <p className="text-muted text-[12.5px] font-semibold">Chargement…</p>
      ) : members.length === 0 ? (
        <p className="text-muted text-[12.5px] font-semibold">
          Aucun membre visible (accès réservé DG/RH).
        </p>
      ) : (
        <div className="flex flex-col">
          {members.map((m: Member, i) => {
            const actif = m.statut === "actif";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 py-3",
                  i < members.length - 1 && "border-border border-b",
                )}
              >
                <span className="bg-active text-accent flex size-9 flex-none items-center justify-center rounded-full text-[11px] font-bold">
                  {m.initials}
                </span>
                <div className="min-w-0 flex-[1.4]">
                  <div className="text-foreground truncate text-[12.5px] font-bold">
                    {m.name}
                  </div>
                  <div className="text-muted truncate text-[11px] font-semibold">
                    {m.email}
                  </div>
                </div>
                <div className="text-muted flex-1 text-[12px] font-semibold">
                  {m.roleLabel}
                </div>
                <StatusPill variant={actif ? "success" : "warning"} uppercase>
                  {actif ? "Actif" : "Suspendu"}
                </StatusPill>
                {canManage && (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={mut.isPending}
                    onClick={() => mut.mutate({ id: m.id, actif: !actif })}
                  >
                    {actif ? "Suspendre" : "Réactiver"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-muted mt-3 text-[10.5px] font-medium">
        Le rôle est attribué à la création du compte. La suspension révoque
        l&apos;accès du membre à la plateforme.
      </p>
    </Card>
  );
}

// ── Sécurité : changement de mot de passe réel + état de sécurité honnête ────

/** Bascule du rôle actif — visible seulement pour un membre multi-rôles. */
function RoleSwitcher() {
  const [roles, setRoles] = useState<string[]>([]);
  const [active, setActive] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        const meta = (data.session?.user.app_metadata ?? {}) as Record<string, unknown>;
        const rs = Array.isArray(meta.roles) ? (meta.roles as string[]).map(String) : [];
        setRoles(rs);
        setActive(String(meta.role ?? ""));
      });
  }, []);

  if (roles.length <= 1) return null;

  const roleLabel = (r: string) => ROLES[r.toLowerCase() as RoleId]?.fonction ?? r;

  async function switchTo(r: string) {
    if (r === active || busy) return;
    setBusy(true);
    try {
      await switchActiveRole(r);
      await createClient().auth.refreshSession();
      toast.success("Rôle actif changé", "Rechargement…");
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Card className="p-[20px]">
      <div className="text-foreground mb-2 text-[15px] font-extrabold tracking-[-0.3px]">
        Rôle actif
      </div>
      <p className="text-muted mb-3 text-[12px] font-semibold">
        Vous occupez {roles.length} rôles. Choisissez celui sous lequel vous travaillez
        (il pilote votre menu et vos accès aux données).
      </p>
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r}
            disabled={busy}
            onClick={() => switchTo(r)}
            className={cn(
              "rounded-[10px] border px-3 py-2 text-[12.5px] font-bold transition-colors disabled:opacity-50",
              r === active
                ? "border-accent bg-accent/14 text-accent"
                : "border-border bg-surface2 text-muted hover:bg-hover",
            )}
          >
            {roleLabel(r)}
            {r === active ? " · actif" : ""}
          </button>
        ))}
      </div>
    </Card>
  );
}

function SecuritePanel() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");

  const change = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mot de passe modifié");
      setPwd("");
      setConfirm("");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Échec : ${msg}`);
    },
  });

  const valid = pwd.length >= 8 && pwd === confirm;

  const STATUS: { title: string; detail: string }[] = [
    { title: "Chiffrement en transit (TLS/HTTPS)", detail: "HSTS activé (2 ans, preload)" },
    { title: "Isolation des données (RLS)", detail: "Activée sur 100 % des tables" },
    {
      title: "En-têtes de sécurité",
      detail: "X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy",
    },
    { title: "Authentification", detail: "Session Supabase (JWT), déconnexion disponible" },
  ];

  return (
    <div className="flex flex-col gap-[15px]">
      <RoleSwitcher />

      <Card className="p-[20px]">
        <div className="text-foreground mb-4 flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.3px]">
          <KeyRound className="size-4" /> Changer mon mot de passe
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) change.mutate();
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className={label}>Nouveau mot de passe</label>
            <input
              type="password"
              className={field}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="8 caractères minimum"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={label}>Confirmer</label>
            <input
              type="password"
              className={field}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {confirm.length > 0 && pwd !== confirm && (
            <p className="text-danger text-[11.5px] font-semibold">
              Les mots de passe ne correspondent pas.
            </p>
          )}
          <Button type="submit" disabled={!valid || change.isPending}>
            {change.isPending ? "Modification…" : "Mettre à jour le mot de passe"}
          </Button>
        </form>
      </Card>

      <Card className="p-[20px]">
        <div className="text-foreground mb-4 text-[15px] font-extrabold tracking-[-0.3px]">
          État de sécurité
        </div>
        <div className="flex flex-col gap-2.5">
          {STATUS.map((s) => (
            <div
              key={s.title}
              className="border-border bg-surface2 flex items-start gap-3 rounded-xl border px-4 py-3"
            >
              <CheckCircle2 className="text-success mt-0.5 size-4 flex-none" />
              <div className="min-w-0">
                <div className="text-foreground text-[13px] font-bold">{s.title}</div>
                <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
                  {s.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Données : export réel + informations honnêtes ───────────────────────────

function DonneesPanel() {
  const exportMembers = useMutation({
    mutationFn: async () => {
      const members = await fetchMembers();
      const rows: (string | number)[][] = [
        ["Nom", "E-mail", "Téléphone", "Rôle", "Statut"],
        ...members.map((m) => [m.name, m.email, m.phone, m.roleLabel, m.statut]),
      ];
      downloadCsv("membres-pilotepme", rows);
    },
    onSuccess: () => toast.success("Export des membres téléchargé"),
    onError: () => toast.error("Export refusé (accès requis)."),
  });

  return (
    <Card className="p-[20px]">
      <div className="text-foreground mb-4 text-[15px] font-extrabold tracking-[-0.3px]">
        Données &amp; conformité
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="border-border bg-surface2 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <div className="min-w-0">
            <div className="text-foreground text-[13px] font-bold">Export des membres</div>
            <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
              Télécharger la liste des utilisateurs au format Excel/CSV
            </div>
          </div>
          <Button
            size="sm"
            disabled={exportMembers.isPending}
            onClick={() => exportMembers.mutate()}
          >
            <Download className="size-4" /> Exporter
          </Button>
        </div>

        <div className="border-border bg-surface2 rounded-xl border px-4 py-3">
          <div className="text-foreground text-[13px] font-bold">Sauvegardes</div>
          <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
            Sauvegardes automatiques quotidiennes gérées par Supabase (Point-in-Time
            Recovery selon l&apos;abonnement). Export manuel via l&apos;administration.
          </div>
        </div>

        <div className="border-border bg-surface2 rounded-xl border px-4 py-3">
          <div className="text-foreground text-[13px] font-bold">Conformité APDP (Sénégal)</div>
          <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
            Données protégées par isolation par rôle (RLS). Registre de traitement à
            tenir par la Direction.
          </div>
        </div>
      </div>
    </Card>
  );
}
