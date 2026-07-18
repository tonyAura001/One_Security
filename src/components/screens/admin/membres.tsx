"use client";

import { useMemo, useState } from "react";
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
import { ROLE_ORDER, ROLES, type RoleId } from "@/lib/rbac";
import { formatRelative } from "@/lib/format";
import { toast } from "@/lib/toast";

export function AdminMembres() {
  const { members, suspend, reactivate, revoke, invite } = useMembersStore();
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

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={(data) => {
          invite(data);
          toast.success(
            "Invitation envoyée",
            `${data.name} · ${data.roleLabel}`,
          );
        }}
      />
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
  const meta = STATUT_META[m.statut];
  const roleGrad = ROLES[m.role].gradient;
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
      </td>
    </tr>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInvite: (data: {
    name: string;
    email: string;
    role: RoleId;
    roleLabel: string;
    site: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleId>("controleur");
  const [site, setSite] = useState("Siège");

  function submit() {
    if (!name.trim() || !email.trim()) {
      toast.error("Nom et email requis");
      return;
    }
    onInvite({ name, email, role, roleLabel: ROLES[role].fonction, site });
    onOpenChange(false);
    setName("");
    setEmail("");
    setSite("Siège");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-surface-border bg-surface max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary">
            Inviter un membre
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <label className="label">Nom complet</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Awa Ndiaye"
          />
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@dakarsecurite.sn"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rôle</label>
              <select
                className="input cursor-pointer"
                value={role}
                onChange={(e) => setRole(e.target.value as RoleId)}
              >
                {ROLE_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {ROLES[id].fonction}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Site</label>
              <input
                className="input"
                value={site}
                onChange={(e) => setSite(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="primary"
            icon={<UserPlus size={15} />}
            onClick={submit}
          >
            Envoyer l’invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
