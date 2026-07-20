"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Shield,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Can } from "@/components/access/can";
// Composants du kit Aurantir (thémés)
import { Button, Card, StatCard, Badge } from "@/aurantir-front-kit";
// Primitives thémées locales (menus/dialog theme-safe)
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMembersStore, STATUT_META, type Member } from "@/lib/store/members";
import { fetchMembers } from "@/lib/supabase/data/members";
import { ROLE_ORDER, ROLES, type RoleId } from "@/lib/rbac";
import { formatRelative } from "@/lib/format";
import { toast } from "@/lib/toast";
import {
  inviteMember,
  resetMemberPassword,
  setMemberRoles,
} from "@/lib/supabase/data/admin-members";

export function AdminMembres() {
  const { members, suspend, reactivate, revoke } = useMembersStore();
  // Hydrate le store depuis la table User (RLS DG/RH) ; repli SEED démo sinon.
  const { data } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });
  useEffect(() => {
    useMembersStore.setState({ members: data ?? [] });
  }, [data]);
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const counts = useMemo(() => {
    const c = { total: 0, actif: 0, suspendu: 0, invite: 0 };
    for (const m of members) {
      if (m.statut !== "revoque") c.total++;
      if (m.statut === "actif") c.actif++;
      if (m.statut === "suspendu") c.suspendu++;
      if (m.statut === "invite") c.invite++;
    }
    return c;
  }, [members]);

  const filtered = members.filter((m) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.roleLabel.toLowerCase().includes(q)
    );
  });

  return (
    <ScreenContainer>
      {/* KPIs (StatCard du kit) */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Effectif"
          value={counts.total}
          color="blue"
          icon={<Users size={16} />}
        />
        <StatCard
          label="Actifs"
          value={counts.actif}
          color="green"
          icon={<Shield size={16} />}
        />
        <StatCard
          label="Suspendus"
          value={counts.suspendu}
          color="amber"
          icon={<Pause size={16} />}
        />
        <StatCard
          label="Invitations en attente"
          value={counts.invite}
          color="violet"
          icon={<UserPlus size={16} />}
        />
      </div>

      <Card padding="none" className="overflow-hidden">
        {/* Toolbar */}
        <div className="border-surface-border flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="border-surface-border bg-background-elevated flex min-w-[220px] flex-1 items-center gap-2.5 rounded-lg border px-3 py-2">
            <Search size={14} className="text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un membre, un rôle…"
              aria-label="Rechercher un membre"
              className="text-text-primary placeholder:text-text-muted w-full border-0 bg-transparent text-sm focus:outline-none"
            />
          </div>
          <Can permission="gererUtilisateurs">
            <Button
              variant="primary"
              icon={<Plus size={15} />}
              onClick={() => setInviteOpen(true)}
            >
              Inviter un membre
            </Button>
          </Can>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Rôle</th>
                <th>Site</th>
                <th>Statut</th>
                <th>Dernière activité</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  onSuspend={() => {
                    suspend(m.id);
                    toast.warning(`${m.name} suspendu`);
                  }}
                  onReactivate={() => {
                    reactivate(m.id);
                    toast.success(`${m.name} réactivé`);
                  }}
                  onRevoke={() => {
                    revoke(m.id);
                    toast.error(`${m.name} révoqué`, "Accès plateforme retiré");
                  }}
                  onResend={() => toast.success("Invitation renvoyée", m.email)}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-text-muted p-10 text-center text-sm">
              Aucun membre ne correspond.
            </div>
          )}
        </div>
      </Card>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </ScreenContainer>
  );
}

function MemberRow({
  member: m,
  onSuspend,
  onReactivate,
  onRevoke,
  onResend,
}: {
  member: Member;
  onSuspend: () => void;
  onReactivate: () => void;
  onRevoke: () => void;
  onResend: () => void;
}) {
  const qc = useQueryClient();
  const meta = STATUT_META[m.statut];
  const roleGrad = ROLES[m.role].gradient;
  const [pwOpen, setPwOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [pickRoles, setPickRoles] = useState<RoleId[]>([m.role]);

  const resetPw = useMutation({
    mutationFn: () => resetMemberPassword(m.id, newPw),
    onSuccess: () => {
      toast.success("Mot de passe réinitialisé", m.email);
      setPwOpen(false);
      setNewPw("");
    },
    onError: (e: unknown) => toast.error(adminErr(e)),
  });
  const saveRoles = useMutation({
    mutationFn: () => setMemberRoles(m.id, pickRoles),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Rôles mis à jour", `${pickRoles.length} rôle(s)`);
      setRolesOpen(false);
    },
    onError: (e: unknown) => toast.error(adminErr(e)),
  });
  const toggle = (id: RoleId) =>
    setPickRoles((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          <div
            className="flex size-8 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
            style={{
              background: `linear-gradient(145deg, ${roleGrad[0]}, ${roleGrad[1]})`,
            }}
          >
            {m.initials}
          </div>
          <div className="min-w-0">
            <div className="text-text-primary truncate text-sm font-medium">
              {m.name}
            </div>
            <div className="text-2xs text-text-muted truncate">{m.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span className="text-text-secondary text-sm">{m.roleLabel}</span>
      </td>
      <td>
        <span className="text-text-secondary text-sm">{m.site}</span>
      </td>
      <td>
        <Badge variant={meta.variant} dot>
          {meta.label}
        </Badge>
      </td>
      <td>
        <span className="text-text-muted text-sm">
          {m.lastSeen ? formatRelative(m.lastSeen) : "—"}
        </span>
      </td>
      <td>
        <div className="flex justify-end">
          {m.statut === "revoque" ? (
            <span className="text-2xs text-text-muted">—</span>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={`Actions pour ${m.name}`}
                  className="text-text-muted hover:bg-surface-hover hover:text-text-primary rounded-lg p-1.5 transition-colors"
                >
                  <MoreHorizontal size={15} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-surface-border bg-surface w-48"
              >
                {m.statut === "invite" && (
                  <DropdownMenuItem onSelect={onResend}>
                    <UserPlus size={14} /> Renvoyer l’invitation
                  </DropdownMenuItem>
                )}
                {m.statut === "actif" && (
                  <DropdownMenuItem onSelect={onSuspend}>
                    <Pause size={14} /> Suspendre
                  </DropdownMenuItem>
                )}
                {m.statut === "suspendu" && (
                  <DropdownMenuItem onSelect={onReactivate}>
                    <Play size={14} /> Réactiver
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => { setPickRoles([m.role]); setRolesOpen(true); }}>
                  <Shield size={14} /> Modifier les rôles
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPwOpen(true)}>
                  <UserPlus size={14} /> Réinitialiser le mot de passe
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={onRevoke}
                  className="text-danger focus:text-danger"
                >
                  <UserX size={14} /> Révoquer l’accès
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Dialogue : réinitialiser le mot de passe (DG) */}
        <Dialog open={pwOpen} onOpenChange={setPwOpen}>
          <DialogContent className="border-surface-border bg-surface max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-text-primary">Réinitialiser le mot de passe</DialogTitle>
            </DialogHeader>
            <div className="py-1">
              <label className="label">Nouveau mot de passe pour {m.name}</label>
              <input className="input" type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="8 caractères minimum" autoComplete="new-password" />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="secondary" onClick={() => setPwOpen(false)}>Annuler</Button>
              <Button variant="primary" disabled={newPw.length < 8 || resetPw.isPending} onClick={() => resetPw.mutate()}>
                {resetPw.isPending ? "…" : "Définir le mot de passe"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialogue : modifier les rôles (DG) */}
        <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
          <DialogContent className="border-surface-border bg-surface max-w-md">
            <DialogHeader>
              <DialogTitle className="text-text-primary">Rôles de {m.name}</DialogTitle>
            </DialogHeader>
            <div className="py-1">
              <label className="label">Rôles attribués (le 1er coché = rôle actif)</label>
              <div className="border-surface-border grid grid-cols-2 gap-1.5 rounded-lg border p-2">
                {ROLE_ORDER.map((id) => (
                  <label key={id} className="text-text-secondary flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[12.5px] font-semibold hover:bg-surface-hover">
                    <input type="checkbox" checked={pickRoles.includes(id)} onChange={() => toggle(id)} className="accent-blue" />
                    {ROLES[id].fonction}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="secondary" onClick={() => setRolesOpen(false)}>Annuler</Button>
              <Button variant="primary" disabled={pickRoles.length === 0 || saveRoles.isPending} onClick={() => saveRoles.mutate()}>
                {saveRoles.isPending ? "…" : "Enregistrer les rôles"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  );
}

function adminErr(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return /service_role|indisponible/i.test(msg)
    ? "Action indisponible : clé service_role non configurée sur le serveur."
    : msg;
}

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<RoleId[]>(["controleur"]);

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setRoles(["controleur"]);
  }
  function toggleRole(id: RoleId) {
    setRoles((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));
  }

  const mut = useMutation({
    mutationFn: () => inviteMember({ nom: name, email, password, roles }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Membre créé", `${email} · ${roles.length} rôle(s)`);
      onOpenChange(false);
      reset();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /service_role|indisponible/i.test(msg)
          ? "Création indisponible : clé service_role non configurée sur le serveur."
          : msg,
      );
    },
  });

  const valid =
    name.trim().length > 0 && email.trim().length > 0 && password.length >= 8 && roles.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-surface-border bg-surface max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary">Inviter un membre</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div>
            <label className="label">Nom complet</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Awa Ndiaye" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@onesecurity.sn" />
          </div>
          <div>
            <label className="label">Mot de passe (défini par la Direction)</label>
            <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" autoComplete="new-password" />
          </div>
          <div>
            <label className="label">Rôles (le 1er coché = rôle actif par défaut)</label>
            <div className="border-surface-border grid grid-cols-2 gap-1.5 rounded-lg border p-2">
              {ROLE_ORDER.map((id) => (
                <label key={id} className="text-text-secondary flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[12.5px] font-semibold hover:bg-surface-hover">
                  <input type="checkbox" checked={roles.includes(id)} onChange={() => toggleRole(id)} className="accent-blue" />
                  {ROLES[id].fonction}
                </label>
              ))}
            </div>
            {roles.length > 1 && (
              <div className="text-text-muted mt-1 text-[11px]">
                Rôle actif : <b>{ROLES[roles[0]].fonction}</b> · le membre pourra basculer entre ses {roles.length} rôles.
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="primary" icon={<UserPlus size={15} />} onClick={() => valid && mut.mutate()} disabled={!valid || mut.isPending}>
            {mut.isPending ? "Création…" : "Créer le membre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
