"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { LogIn, MailPlus, ShieldCheck, UserCheck } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  getClientAccess,
  getAccessStats,
  ACCESS_ROLE_META,
  ACCESS_STATUS_META,
  type ClientAccess,
} from "@/lib/api/access";
import { formatDateFR } from "@/lib/format";
import { toast } from "@/lib/toast";

function useColumns(): ColumnDef<ClientAccess>[] {
  return [
    {
      accessorKey: "client",
      header: "Client / site",
      cell: ({ row }) => (
        <div>
          <div className="text-foreground font-bold">{row.original.client}</div>
          <div className="text-muted text-[11.5px] font-semibold">
            {row.original.site}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "contact",
      header: "Contact",
      cell: ({ row }) => (
        <div>
          <div className="text-foreground font-semibold">
            {row.original.contact}
          </div>
          <div className="text-muted text-[11.5px] font-semibold">
            {row.original.email}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Rôle",
      cell: ({ row }) => (
        <span className="text-muted font-semibold">
          {ACCESS_ROLE_META[row.original.role]}
        </span>
      ),
    },
    {
      id: "lastLogin",
      accessorFn: (r) => r.lastLogin ?? "",
      header: "Dernière connexion",
      cell: ({ row }) =>
        row.original.lastLogin ? (
          <span className="text-muted font-semibold whitespace-nowrap">
            {formatDateFR(row.original.lastLogin, "d MMM yyyy")}
          </span>
        ) : (
          <span className="text-muted font-semibold italic">Jamais</span>
        ),
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => {
        const meta = ACCESS_STATUS_META[row.original.status];
        return <StatusPill variant={meta.variant}>{meta.label}</StatusPill>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1.5">
          {row.original.status === "invite" ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                toast.info(`Invitation renvoyée à ${row.original.contact}`)
              }
            >
              Relancer
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                toast.warning(`Accès de ${row.original.client} suspendu`)
              }
            >
              Suspendre
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            className="text-danger"
            onClick={() => toast.warning(`Accès de ${row.original.client} révoqué`)}
          >
            Révoquer
          </Button>
        </div>
      ),
    },
  ];
}

export function AccesClientsScreen() {
  const access = useMemo(() => getClientAccess(), []);
  const stats = useMemo(() => getAccessStats(), []);
  const columns = useColumns();

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Accès clients</h1>
          <p className="page-subtitle">
            Comptes du portail client — géré conformément à l’APDP
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => toast.info("Inviter un client", "Fonction de démonstration")}
        >
          <MailPlus className="size-4" /> Inviter
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-3">
        <KpiCard
          icon={UserCheck}
          tone="success"
          value={String(stats.withAccess)}
          label="Clients avec accès portail"
        />
        <KpiCard
          icon={MailPlus}
          tone="warning"
          value={String(stats.pendingInvites)}
          label="Invitations en attente"
        />
        <KpiCard
          icon={LogIn}
          tone="accent"
          value={String(stats.loginsThisMonth)}
          label="Connexions ce mois"
        />
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={access}
          searchable
          searchPlaceholder="Rechercher un client, un contact…"
          emptyTitle="Aucun accès"
          emptyDescription="Invitez vos clients à leur espace de suivi."
        />
      </div>

      <div className="text-muted mt-3 flex items-center gap-2 text-[11.5px] font-semibold">
        <ShieldCheck className="text-success size-4" />
        Chaque accès et révocation est journalisé (traçabilité APDP).
      </div>
    </ScreenContainer>
  );
}
