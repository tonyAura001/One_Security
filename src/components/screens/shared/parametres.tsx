"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  KeyRound,
  Palette,
  PenLine,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/documents/signature-pad";
import type { DocSignature } from "@/lib/documents/types";
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
  mergeIdentity,
  PARAM_LABELS,
  PARAM_KEYS,
  COMPANY_FIELDS,
  BRAND_THEMES,
  type Parametres,
} from "@/lib/supabase/data/parametres";
import { fetchMembers, setMemberActif } from "@/lib/supabase/data/members";
import { fetchMyProfile, updateMyProfile } from "@/lib/supabase/data/profile";
import type { Member } from "@/lib/store/members";

type Tab =
  | "profil"
  | "general"
  | "identite"
  | "signature"
  | "equipe"
  | "documents";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "profil", label: "Mon profil", icon: UserCog },
  { id: "general", label: "Général", icon: Building2 },
  { id: "identite", label: "Identité visuelle", icon: Palette },
  { id: "signature", label: "Signature", icon: PenLine },
  { id: "equipe", label: "Équipe", icon: Users },
  { id: "documents", label: "Documents", icon: FileText },
];

/** Anciens deep-links (menu profil) → onglets. */
const DEEP_LINK: Record<string, Tab> = {
  profil: "profil",
  securite: "profil",
  entreprise: "general",
  general: "general",
  identite: "identite",
  signature: "signature",
  membres: "equipe",
  equipe: "equipe",
  donnees: "documents",
  documents: "documents",
};

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50 disabled:opacity-60";
const label =
  "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";
const cardTitle = "text-foreground text-[15px] font-extrabold tracking-[-0.3px]";

export function SharedParametres() {
  const [tab, setTab] = useState<Tab>("profil");

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("section");
    if (s && DEEP_LINK[s]) setTab(DEEP_LINK[s]);
  }, []);

  return (
    <ScreenContainer>
      {/* Barre d'onglets horizontale */}
      <Card className="mb-[15px] flex gap-1 overflow-x-auto p-1.5 no-scrollbar">
        {TABS.map((t) => {
          const active = t.id === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              className={cn(
                "flex flex-none items-center gap-2 rounded-[10px] px-3.5 py-2 text-[12.5px] font-bold whitespace-nowrap transition-colors",
                active
                  ? "bg-accent/14 text-accent"
                  : "text-muted hover:bg-hover hover:text-foreground",
              )}
            >
              <Icon className="size-4" strokeWidth={1.8} />
              {t.label}
            </button>
          );
        })}
      </Card>

      {tab === "profil" && <MonProfilPanel />}
      {tab === "general" && <GeneralPanel />}
      {tab === "identite" && <IdentiteVisuellePanel />}
      {tab === "signature" && <SignaturePanel />}
      {tab === "equipe" && <EquipePanel />}
      {tab === "documents" && <DocumentsPanel />}
    </ScreenContainer>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Lit un fichier image en data URL (limité en taille pour rester dans Parametre). */
function readImageFile(file: File, maxKb = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Fichier image attendu (PNG, JPEG, SVG)."));
      return;
    }
    if (file.size > maxKb * 1024) {
      reject(new Error(`Image trop lourde (max ${Math.round(maxKb / 100) / 10} Mo).`));
      return;
    }
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Lecture du fichier impossible."));
    r.readAsDataURL(file);
  });
}

// ── Onglet 1 · Mon profil (coordonnées + mot de passe + sécurité) ───────────

function MonProfilPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");

  useEffect(() => {
    if (data) {
      setPrenom(data.prenom);
      setNom(data.nom);
      setTelephone(data.telephone);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateMyProfile({ prenom, nom, telephone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Profil mis à jour");
    },
    onError: (e: unknown) =>
      toast.error(`Échec : ${e instanceof Error ? e.message : String(e)}`),
  });

  return (
    <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-[15px]">
        <Card className="p-[20px]">
          <div className={cn(cardTitle, "mb-4 flex items-center gap-2")}>
            <UserCog className="size-4" /> Informations personnelles
          </div>

          <div className="border-border mb-4 flex items-center gap-3 border-b pb-4">
            <span className="bg-accent flex size-[52px] flex-none items-center justify-center rounded-[14px] text-[16px] font-black text-white">
              {data?.initials ?? "··"}
            </span>
            <div className="min-w-0">
              <div className="text-foreground truncate text-[15px] font-extrabold">
                {data ? `${data.prenom} ${data.nom}`.trim() : "…"}
              </div>
              <div className="text-muted mt-0.5 truncate text-[11.5px] font-semibold">
                {data?.email}
              </div>
              <StatusPill variant="info" className="mt-1.5">
                {data?.roleLabel ?? "—"}
              </StatusPill>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Prénom</label>
                <input className={field} value={prenom} onChange={(e) => setPrenom(e.target.value)} />
              </div>
              <div>
                <label className={label}>Nom</label>
                <input className={field} value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={label}>Téléphone</label>
              <input
                className={field}
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+221 77 000 00 00"
              />
            </div>

            <div className="border-border bg-surface2 flex flex-col gap-1.5 rounded-xl border px-4 py-3 text-[12px]">
              <Row k="E-mail" v={data?.email ?? "—"} hint="non modifiable" />
              <Row k="Rôle" v={data?.roleLabel ?? "—"} />
              <Row k="Entreprise" v={ONE_SECURITY.name} />
            </div>

            <Button disabled={save.isPending || !data} onClick={() => save.mutate()}>
              {save.isPending ? "Enregistrement…" : "Enregistrer mes coordonnées"}
            </Button>
          </div>
        </Card>

        <RoleSwitcher />
      </div>

      <div className="flex flex-col gap-[15px]">
        <PasswordCard email={data?.email} />
        <SecurityStatusCard />
      </div>
    </div>
  );
}

function Row({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted flex-none font-semibold">{k}</span>
      <span className="text-foreground min-w-0 truncate text-right font-bold">
        {v}
        {hint && <span className="text-muted ml-1.5 font-medium">({hint})</span>}
      </span>
    </div>
  );
}

function PasswordCard({ email }: { email?: string }) {
  const [current, setCurrent] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const change = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      if (email && current) {
        const { error: reauth } = await supabase.auth.signInWithPassword({
          email,
          password: current,
        });
        if (reauth) throw new Error("Mot de passe actuel incorrect.");
      }
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mot de passe modifié");
      setCurrent("");
      setPwd("");
      setConfirm("");
    },
    onError: (e: unknown) =>
      toast.error(`Échec : ${e instanceof Error ? e.message : String(e)}`),
  });

  const valid = pwd.length >= 8 && pwd === confirm;

  return (
    <Card className="p-[20px]">
      <div className={cn(cardTitle, "mb-4 flex items-center gap-2")}>
        <KeyRound className="size-4" /> Sécurité — Changer le mot de passe
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) change.mutate();
        }}
        className="flex flex-col gap-3.5"
      >
        <div>
          <label className={label}>Mot de passe actuel</label>
          <div className="relative">
            <input
              type={showCur ? "text" : "password"}
              className={cn(field, "pr-10")}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
            <EyeButton on={showCur} toggle={() => setShowCur((v) => !v)} />
          </div>
        </div>
        <div>
          <label className={label}>Nouveau mot de passe</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              className={cn(field, "pr-10")}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Minimum 8 caractères"
              autoComplete="new-password"
            />
            <EyeButton on={showNew} toggle={() => setShowNew((v) => !v)} />
          </div>
        </div>
        <div>
          <label className={label}>Confirmer le nouveau mot de passe</label>
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
          <KeyRound className="size-4" />
          {change.isPending ? "Modification…" : "Changer le mot de passe"}
        </Button>
      </form>
    </Card>
  );
}

function EyeButton({ on, toggle }: { on: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? "Masquer" : "Afficher"}
      className="text-muted hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
    >
      {on ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

function SecurityStatusCard() {
  const STATUS = [
    { title: "Chiffrement en transit (TLS/HTTPS)", detail: "HSTS activé (2 ans, preload)" },
    { title: "Isolation des données (RLS)", detail: "Activée sur 100 % des tables" },
    {
      title: "En-têtes de sécurité",
      detail: "X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy",
    },
    { title: "Authentification", detail: "Session Supabase (JWT), déconnexion disponible" },
  ];
  return (
    <Card className="p-[20px]">
      <div className={cn(cardTitle, "mb-4 flex items-center gap-2")}>
        <ShieldCheck className="size-4" /> État de sécurité
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
              <div className="text-muted mt-0.5 text-[11.5px] font-semibold">{s.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

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
      <div className={cn(cardTitle, "mb-2")}>Rôle actif</div>
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

// ── Onglet 2 · Général (identité légale de l'entreprise) ────────────────────

function GeneralPanel() {
  const qc = useQueryClient();
  const { role } = useSession();
  const canEdit = role === "dg" || role === "rp";
  const { data } = useQuery({ queryKey: ["parametres"], queryFn: fetchParametres });
  const [form, setForm] = useState<Parametres>({});

  useEffect(() => {
    if (data) {
      const next: Parametres = { ...data };
      for (const f of COMPANY_FIELDS) if (next[f.cle] === undefined) next[f.cle] = f.defaut;
      setForm(next);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveParametres(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parametres"] });
      toast.success("Informations enregistrées");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level|refusé|policy/i.test(msg) ? "Accès refusé (DG/RP requis)." : `Échec : ${msg}`,
      );
    },
  });
  const set = (cle: string, v: string) => setForm((f) => ({ ...f, [cle]: v }));

  return (
    <Card className="p-[20px]">
      <div className={cn(cardTitle, "mb-1")}>Informations légales de l&apos;entreprise</div>
      <p className="text-muted mb-4 text-[12px] font-semibold">
        Ces informations alimentent les documents officiels (en-tête, pied de page, cachet).
      </p>

      {canEdit ? (
        <>
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {COMPANY_FIELDS.map((f) => (
              <div key={f.cle} className={f.textarea ? "md:col-span-2" : ""}>
                <label className={label}>{f.label}</label>
                {f.textarea ? (
                  <textarea
                    className={`${field} min-h-[54px] resize-y`}
                    value={form[f.cle] ?? ""}
                    onChange={(e) => set(f.cle, e.target.value)}
                  />
                ) : (
                  <input
                    className={field}
                    value={form[f.cle] ?? ""}
                    onChange={(e) => set(f.cle, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <Button className="mt-4" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {COMPANY_FIELDS.map((f) => (
              <div key={f.cle} className="flex items-start justify-between gap-4">
                <span className="text-muted flex-none text-[12.5px] font-semibold">{f.label}</span>
                <span className="text-foreground text-right text-[12.5px] font-bold">
                  {form[f.cle] || f.defaut || "—"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-muted mt-3 text-[10.5px] font-medium">
            Modifiable par la Direction (DG) et les Responsables des Prestations (RP).
          </p>
        </>
      )}
    </Card>
  );
}

// ── Onglet 3 · Identité visuelle (logo + couleurs + aperçu PDF) ─────────────

function IdentiteVisuellePanel() {
  const qc = useQueryClient();
  const { role } = useSession();
  const canEdit = role === "dg" || role === "rp";
  const { data } = useQuery({ queryKey: ["parametres"], queryFn: fetchParametres });
  const [form, setForm] = useState<Parametres>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const identity = useMemo(() => mergeIdentity(form), [form]);
  const set = (cle: string, v: string) => setForm((f) => ({ ...f, [cle]: v }));

  const save = useMutation({
    mutationFn: () =>
      saveParametres({
        [PARAM_KEYS.logo]: form[PARAM_KEYS.logo] ?? "",
        [PARAM_KEYS.couleurPrincipale]: form[PARAM_KEYS.couleurPrincipale] ?? identity.couleurPrincipale,
        [PARAM_KEYS.couleurAccent]: form[PARAM_KEYS.couleurAccent] ?? identity.couleurAccent,
        [PARAM_KEYS.themePredefini]: form[PARAM_KEYS.themePredefini] ?? "",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parametres"] });
      toast.success("Identité visuelle enregistrée");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level|refusé|policy/i.test(msg) ? "Accès refusé (DG/RP requis)." : `Échec : ${msg}`,
      );
    },
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      set(PARAM_KEYS.logo, await readImageFile(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  const applyTheme = (id: string) => {
    const t = BRAND_THEMES.find((x) => x.id === id);
    if (!t) return;
    setForm((f) => ({
      ...f,
      [PARAM_KEYS.themePredefini]: id,
      [PARAM_KEYS.couleurPrincipale]: t.principale,
      [PARAM_KEYS.couleurAccent]: t.accent,
    }));
  };

  return (
    <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-2 lg:items-start">
      {/* Logo */}
      <Card className="p-[20px]">
        <div className={cn(cardTitle, "mb-4 flex items-center gap-2")}>
          <ImageIcon className="size-4" /> Logo de l&apos;entreprise
        </div>

        <button
          type="button"
          disabled={!canEdit}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (canEdit) onFile(e.dataTransfer.files?.[0]);
          }}
          className="border-border hover:border-accent/50 flex min-h-[150px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors disabled:opacity-60"
        >
          {identity.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={identity.logo} alt="Logo" className="max-h-[96px] max-w-full object-contain" />
          ) : (
            <>
              <ImageIcon className="text-muted size-7" strokeWidth={1.6} />
              <span className="text-muted text-[12px] font-semibold">
                Cliquez ou déposez pour {identity.logo ? "remplacer" : "ajouter"} un logo
              </span>
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        {identity.logo && (
          <div className="border-border bg-surface2 mt-3 flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
            <div className="flex items-center gap-2 text-[12.5px]">
              <CheckCircle2 className="text-success size-4 flex-none" />
              <div>
                <div className="text-success font-bold">Logo chargé</div>
                <div className="text-muted font-semibold">Visible sur tous vos PDF</div>
              </div>
            </div>
            {canEdit && (
              <Button size="sm" variant="destructive" onClick={() => set(PARAM_KEYS.logo, "")}>
                <Trash2 className="size-3.5" /> Supprimer
              </Button>
            )}
          </div>
        )}
        <p className="text-muted mt-3 text-[10.5px] font-medium">
          PNG ou SVG à fond transparent recommandé (max ~0,9 Mo).
        </p>
      </Card>

      {/* Thème & couleurs + aperçu */}
      <Card className="p-[20px]">
        <div className={cn(cardTitle, "mb-4 flex items-center gap-2")}>
          <Palette className="size-4" /> Thème &amp; couleurs
        </div>

        <div className="flex flex-col gap-3.5">
          <div>
            <label className={label}>Thème prédéfini</label>
            <select
              className={field}
              disabled={!canEdit}
              value={form[PARAM_KEYS.themePredefini] ?? ""}
              onChange={(e) => applyTheme(e.target.value)}
            >
              <option value="">Personnalisé</option>
              {BRAND_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label="Couleur principale"
              value={identity.couleurPrincipale}
              disabled={!canEdit}
              onChange={(v) => set(PARAM_KEYS.couleurPrincipale, v)}
            />
            <ColorField
              label="Couleur accent"
              value={identity.couleurAccent}
              disabled={!canEdit}
              onChange={(v) => set(PARAM_KEYS.couleurAccent, v)}
            />
          </div>

          {/* Aperçu en-tête PDF */}
          <div>
            <label className={label}>Aperçu de l&apos;en-tête de vos documents</label>
            <div
              className="overflow-hidden rounded-xl border"
              style={{ borderColor: identity.couleurPrincipale }}
            >
              <div
                className="flex items-center justify-between gap-3 px-4 py-3"
                style={{ background: identity.couleurPrincipale }}
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-extrabold text-white">
                    {identity.name}
                  </div>
                  <div className="text-[10.5px] font-semibold text-white/70">
                    NINEA : {identity.ninea}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-[12px] font-black"
                    style={{ color: identity.couleurAccent }}
                  >
                    FAC-2026-001
                  </div>
                  <div className="text-[9px] font-bold tracking-wider text-white/70 uppercase">
                    Facture
                  </div>
                </div>
              </div>
              <div className="bg-white px-4 py-2 text-[10px] font-semibold text-[#6b7280]">
                Aperçu — les couleurs pilotent l&apos;en-tête, le pied de page et le cachet.
              </div>
            </div>
          </div>

          {canEdit ? (
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Enregistrement…" : "Enregistrer l'identité visuelle"}
            </Button>
          ) : (
            <p className="text-muted text-[11.5px] font-semibold">
              Seuls la Direction (DG) et les Responsables (RP) peuvent modifier l&apos;identité visuelle.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function ColorField({
  label: lbl,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={label}>{lbl}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          disabled={disabled}
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="border-border size-9 flex-none cursor-pointer rounded-[10px] border bg-transparent disabled:opacity-60"
        />
        <input
          className={field}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1F3A5F"
        />
      </div>
    </div>
  );
}

// ── Onglet 4 · Signature du dirigeant ───────────────────────────────────────

function SignaturePanel() {
  const qc = useQueryClient();
  const { role } = useSession();
  const canEdit = role === "dg" || role === "rp";
  const { data } = useQuery({ queryKey: ["parametres"], queryFn: fetchParametres });
  const importRef = useRef<HTMLInputElement>(null);
  const [sig, setSig] = useState<DocSignature>({
    signataire: "",
    fonction: "",
    date: "",
    image: "",
  });

  useEffect(() => {
    if (data) {
      const id = mergeIdentity(data);
      setSig({
        signataire: id.signature.signataire,
        fonction: id.signature.fonction,
        date: "",
        image: id.signature.image,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      saveParametres({
        [PARAM_KEYS.signatureImage]: sig.image,
        [PARAM_KEYS.signatureSignataire]: sig.signataire,
        [PARAM_KEYS.signatureFonction]: sig.fonction,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parametres"] });
      toast.success("Signature enregistrée");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level|refusé|policy/i.test(msg) ? "Accès refusé (DG/RP requis)." : `Échec : ${msg}`,
      );
    },
  });

  const remove = useMutation({
    mutationFn: () =>
      saveParametres({
        [PARAM_KEYS.signatureImage]: "",
        [PARAM_KEYS.signatureSignataire]: "",
        [PARAM_KEYS.signatureFonction]: "",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parametres"] });
      setSig({ signataire: "", fonction: "", date: "", image: "" });
      toast.success("Signature supprimée");
    },
    onError: () => toast.error("Suppression refusée (DG/RP requis)."),
  });

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      const img = await readImageFile(file, 400);
      setSig((s) => ({ ...s, image: img }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  const saved = Boolean(data && mergeIdentity(data).signature.image);

  return (
    <Card className="p-[20px]">
      <div className={cn(cardTitle, "mb-1")}>Signature numérique du dirigeant</div>
      <p className="text-muted mb-4 text-[12px] font-semibold">
        Apposée automatiquement dans la zone de signature de vos factures, devis et contrats PDF.
      </p>

      {saved && (
        <div className="border-border bg-surface2 mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-success size-4 flex-none" />
            <div>
              <div className="text-success text-[13px] font-bold">Signature enregistrée</div>
              <div className="text-muted text-[11.5px] font-semibold">
                Elle apparaîtra sur vos factures, devis et contrats.
              </div>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
              <Trash2 className="size-3.5" /> Retirer
            </Button>
          )}
        </div>
      )}

      {canEdit ? (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-muted text-[11px] font-bold tracking-[0.5px] uppercase">
              Dessiner ou importer
            </span>
            <Button size="xs" variant="outline" onClick={() => importRef.current?.click()}>
              <ImageIcon className="size-3" /> Importer une image
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onImport(e.target.files?.[0])}
            />
          </div>

          <SignaturePad value={sig} onChange={(s) => setSig(s ?? { signataire: "", fonction: "", date: "", image: "" })} />

          <Button className="mt-4" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Enregistrement…" : "Enregistrer cette signature"}
          </Button>
        </>
      ) : (
        <p className="text-muted text-[11.5px] font-semibold">
          Seuls la Direction (DG) et les Responsables (RP) peuvent définir la signature officielle.
        </p>
      )}

      {/* Aperçu dans le document PDF */}
      <div className="border-border mt-6 border-t pt-5">
        <div className="text-muted mb-3 text-[11px] font-bold tracking-[0.5px] uppercase">
          Aperçu dans le document PDF
        </div>
        <div className="grid grid-cols-2 gap-6 rounded-xl border border-[#e5e7eb] bg-white p-5">
          <div className="flex flex-col justify-end">
            <div className="h-8 border-b-2 border-[#C9A84C]" />
            <div className="mt-1 text-[11px] font-bold text-[#1F3A5F]">Le Client</div>
            <div className="text-[10px] font-semibold text-[#6b7280]">Signature et cachet</div>
          </div>
          <div className="flex flex-col items-end justify-end">
            {sig.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sig.image} alt="Signature" className="h-10 object-contain" />
            ) : (
              <div className="h-10" />
            )}
            <div className="mt-1 w-full border-t-2 border-[#C9A84C] pt-1 text-right text-[11px] font-bold text-[#1F3A5F]">
              {sig.signataire || ONE_SECURITY.name}
            </div>
            <div className="text-[10px] font-semibold text-[#6b7280]">
              {sig.fonction || "Signature et cachet"}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Onglet 5 · Équipe ────────────────────────────────────────────────────────

function EquipePanel() {
  const qc = useQueryClient();
  const { role } = useSession();
  const canManage = role === "dg" || role === "rh";
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });

  const mut = useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) => setMemberActif(id, actif),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Statut du membre mis à jour");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level|refusé|policy/i.test(msg) ? "Accès refusé (DG/RH requis)." : `Échec : ${msg}`,
      );
    },
  });

  const exportMut = useMutation({
    mutationFn: async () => {
      const rows: (string | number)[][] = [
        ["Nom", "E-mail", "Téléphone", "Rôle", "Statut"],
        ...members.map((m) => [m.name, m.email, m.phone, m.roleLabel, m.statut]),
      ];
      downloadCsv("membres-pilotepme", rows);
    },
    onSuccess: () => toast.success("Export téléchargé"),
    onError: () => toast.error("Export refusé (accès requis)."),
  });

  const actifs = members.filter((m) => m.statut === "actif").length;

  return (
    <div className="flex flex-col gap-[15px]">
      {canManage && (
        <div className="border-warning/30 bg-warning/8 flex items-start gap-3 rounded-xl border px-4 py-3">
          <ShieldCheck className="text-warning mt-0.5 size-4 flex-none" />
          <div>
            <div className="text-foreground text-[13px] font-bold">
              Gestion de l&apos;équipe — accès exclusif Direction
            </div>
            <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
              Seuls le DG et le Responsable RH peuvent créer des comptes, attribuer des rôles et
              gérer les accès. Les autres membres ne voient pas cette section.
            </div>
          </div>
        </div>
      )}

      <Card className="p-[20px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className={cn(cardTitle)}>
            Équipe{" "}
            <span className="text-muted text-[12px] font-bold">
              ({actifs} actif{actifs !== 1 ? "s" : ""} / {members.length} total)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={exportMut.isPending} onClick={() => exportMut.mutate()}>
              <Download className="size-3.5" /> Exporter
            </Button>
            {canManage && (
              <Button size="sm" asChild>
                <Link href="/membres">
                  <UserPlus className="size-3.5" /> Ajouter un membre
                </Link>
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted text-[12.5px] font-semibold">Chargement…</p>
        ) : members.length === 0 ? (
          <p className="text-muted text-[12.5px] font-semibold">
            Aucun membre visible (accès réservé DG/RH).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-border border-b">
                  {["Nom", "E-mail", "Rôle", "Statut", "Dernière connexion", ""].map((h, i) => (
                    <th
                      key={h || i}
                      className="text-muted px-2 py-2 text-left text-[10.5px] font-bold tracking-[0.4px] uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m: Member) => {
                  const actif = m.statut === "actif";
                  return (
                    <tr key={m.id} className="border-border border-b last:border-0">
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-active text-accent flex size-8 flex-none items-center justify-center rounded-full text-[11px] font-bold">
                            {m.initials}
                          </span>
                          <span className="text-foreground text-[12.5px] font-bold">{m.name}</span>
                        </div>
                      </td>
                      <td className="text-muted px-2 py-3 text-[12px] font-semibold">{m.email}</td>
                      <td className="px-2 py-3">
                        <span className="border-border bg-surface2 text-foreground inline-block rounded-[8px] border px-2.5 py-1 text-[11.5px] font-bold">
                          {m.roleLabel}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <StatusPill variant={actif ? "success" : "warning"} uppercase>
                          {actif ? "Actif" : "Suspendu"}
                        </StatusPill>
                      </td>
                      <td className="text-muted px-2 py-3 text-[12px] font-semibold">
                        {m.lastSeen
                          ? new Date(m.lastSeen).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-2 py-3 text-right">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-muted mt-3 text-[10.5px] font-medium">
          Le rôle est attribué à la création du compte (bouton « Ajouter un membre »). La suspension
          révoque l&apos;accès du membre à la plateforme.
        </p>
      </Card>
    </div>
  );
}

// ── Onglet 6 · Documents (numérotation + textes légaux) ─────────────────────

function DocumentsPanel() {
  const qc = useQueryClient();
  const { role } = useSession();
  const canEdit = role === "dg" || role === "rp";
  const { data } = useQuery({ queryKey: ["parametres"], queryFn: fetchParametres });
  const [form, setForm] = useState<Parametres>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = (cle: string, v: string) => setForm((f) => ({ ...f, [cle]: v }));

  const save = useMutation({
    mutationFn: () =>
      saveParametres({
        format_facture: form.format_facture ?? "",
        format_devis: form.format_devis ?? "",
        devise: form.devise ?? "",
        delai_relance_jours: form.delai_relance_jours ?? "",
        theme_defaut: form.theme_defaut ?? "",
        [PARAM_KEYS.conditionsPaiement]: form[PARAM_KEYS.conditionsPaiement] ?? "",
        [PARAM_KEYS.mentionsLegales]: form[PARAM_KEYS.mentionsLegales] ?? "",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parametres"] });
      toast.success("Paramètres documents enregistrés");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level|refusé|policy/i.test(msg) ? "Accès refusé (DG/RP requis)." : `Échec : ${msg}`,
      );
    },
  });

  return (
    <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-2 lg:items-start">
      <Card className="p-[20px]">
        <div className={cn(cardTitle, "mb-4")}>Numérotation &amp; réglages</div>
        <div className="flex flex-col gap-3.5">
          {PARAM_LABELS.map((p) => (
            <div key={p.cle}>
              <label className={label}>{p.label}</label>
              {p.cle === "theme_defaut" ? (
                <select
                  className={field}
                  value={form[p.cle] ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => set(p.cle, e.target.value)}
                >
                  <option value="sombre">Sombre</option>
                  <option value="clair">Clair</option>
                </select>
              ) : (
                <input
                  className={field}
                  value={form[p.cle] ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => set(p.cle, e.target.value)}
                />
              )}
            </div>
          ))}
          <p className="text-muted text-[10.5px] font-medium">
            Variables : {"{YYYY}"} = année, {"{MM}"} = mois, {"{NNN}"} = séquence.
          </p>
        </div>
      </Card>

      <Card className="p-[20px]">
        <div className={cn(cardTitle, "mb-4")}>Textes légaux (pied de page PDF)</div>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className={label}>Conditions de paiement</label>
            <textarea
              className={`${field} min-h-[80px] resize-y`}
              disabled={!canEdit}
              value={form[PARAM_KEYS.conditionsPaiement] ?? ""}
              onChange={(e) => set(PARAM_KEYS.conditionsPaiement, e.target.value)}
              placeholder="Paiement à 30 jours à compter de la date de facturation."
            />
          </div>
          <div>
            <label className={label}>Mentions légales</label>
            <textarea
              className={`${field} min-h-[80px] resize-y`}
              disabled={!canEdit}
              value={form[PARAM_KEYS.mentionsLegales] ?? ""}
              onChange={(e) => set(PARAM_KEYS.mentionsLegales, e.target.value)}
              placeholder={`Société au capital de ${ONE_SECURITY.capital} — RCCM : ${ONE_SECURITY.rccm}`}
            />
          </div>
        </div>
      </Card>

      {canEdit ? (
        <div className="lg:col-span-2">
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Enregistrement…" : "Enregistrer les paramètres documents"}
          </Button>
        </div>
      ) : (
        <p className="text-muted text-[11.5px] font-semibold lg:col-span-2">
          Seuls la Direction (DG) et les Responsables (RP) peuvent modifier ces paramètres.
        </p>
      )}
    </div>
  );
}
