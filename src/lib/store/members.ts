"use client";

import { create } from "zustand";
import type { RoleId } from "@/lib/rbac";

export type MemberStatut = "actif" | "suspendu" | "invite" | "revoque";

export interface Member {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  role: RoleId;
  roleLabel: string;
  site: string;
  statut: MemberStatut;
  lastSeen: string; // ISO or "" for invited
}

const SEED: Member[] = [
  {
    id: "m1",
    name: "M. Diallo",
    initials: "MD",
    email: "m.diallo@dakarsecurite.sn",
    phone: "+221 77 512 40 01",
    role: "dg",
    roleLabel: "Directeur Général",
    site: "Siège",
    statut: "actif",
    lastSeen: "2026-07-03T19:40:00",
  },
  {
    id: "m2",
    name: "Fatou Sarr",
    initials: "FS",
    email: "f.sarr@dakarsecurite.sn",
    phone: "+221 77 512 40 02",
    role: "comptable",
    roleLabel: "Comptable",
    site: "Siège",
    statut: "actif",
    lastSeen: "2026-07-03T18:05:00",
  },
  {
    id: "m3",
    name: "Aïda Ba",
    initials: "AB",
    email: "a.ba@dakarsecurite.sn",
    phone: "+221 77 512 40 03",
    role: "rp",
    roleLabel: "Secrétaire",
    site: "Siège",
    statut: "actif",
    lastSeen: "2026-07-03T20:58:00",
  },
  {
    id: "m4",
    name: "Moussa Diop",
    initials: "MO",
    email: "m.diop@dakarsecurite.sn",
    phone: "+221 77 512 40 04",
    role: "rh",
    roleLabel: "Recruteur",
    site: "Siège",
    statut: "actif",
    lastSeen: "2026-07-03T18:22:00",
  },
  {
    id: "m5",
    name: "Ndèye Fall",
    initials: "NF",
    email: "n.fall@dakarsecurite.sn",
    phone: "+221 77 512 40 05",
    role: "rh",
    roleLabel: "Responsable Paie",
    site: "Siège",
    statut: "actif",
    lastSeen: "2026-07-03T17:01:00",
  },
  {
    id: "m6",
    name: "Cheikh Guèye",
    initials: "CG",
    email: "c.gueye@dakarsecurite.sn",
    phone: "+221 77 512 40 06",
    role: "controleur",
    roleLabel: "Chef de contrôle",
    site: "Poste central",
    statut: "actif",
    lastSeen: "2026-07-03T21:10:00",
  },
  {
    id: "m7",
    name: "Sophie Mendy",
    initials: "SM",
    email: "s.mendy@dakarsecurite.sn",
    phone: "+221 77 512 40 07",
    role: "manager",
    roleLabel: "Community Manager",
    site: "Siège",
    statut: "suspendu",
    lastSeen: "2026-06-28T14:30:00",
  },
  {
    id: "m8",
    name: "Ibrahima Sow",
    initials: "IS",
    email: "i.sow@dakarsecurite.sn",
    phone: "+221 77 512 40 08",
    role: "manager",
    roleLabel: "Mainteneur de sites",
    site: "Atelier",
    statut: "actif",
    lastSeen: "2026-07-03T22:45:00",
  },
  {
    id: "m9",
    name: "Awa N’Diaye",
    initials: "AN",
    email: "a.ndiaye@dakarsecurite.sn",
    phone: "+221 77 512 40 09",
    role: "agent",
    roleLabel: "Caissière",
    site: "Boutique",
    statut: "actif",
    lastSeen: "2026-07-03T16:20:00",
  },
  {
    id: "m10",
    name: "Serigne Mbaye",
    initials: "SB",
    email: "s.mbaye@dakarsecurite.sn",
    phone: "+221 77 512 40 10",
    role: "controleur",
    roleLabel: "Chef de contrôle",
    site: "Zone Nord",
    statut: "invite",
    lastSeen: "",
  },
  {
    id: "m11",
    name: "Khady Diouf",
    initials: "KD",
    email: "k.diouf@dakarsecurite.sn",
    phone: "+221 77 512 40 11",
    role: "comptable",
    roleLabel: "Comptable",
    site: "Siège",
    statut: "revoque",
    lastSeen: "2026-05-12T11:00:00",
  },
];

interface MembersState {
  members: Member[];
  suspend: (id: string) => void;
  reactivate: (id: string) => void;
  revoke: (id: string) => void;
  invite: (data: {
    name: string;
    email: string;
    role: RoleId;
    roleLabel: string;
    site: string;
  }) => void;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const useMembersStore = create<MembersState>((set) => ({
  members: SEED,
  suspend: (id) =>
    set((s) => ({
      members: s.members.map((m) =>
        m.id === id ? { ...m, statut: "suspendu" } : m,
      ),
    })),
  reactivate: (id) =>
    set((s) => ({
      members: s.members.map((m) =>
        m.id === id ? { ...m, statut: "actif" } : m,
      ),
    })),
  revoke: (id) =>
    set((s) => ({
      members: s.members.map((m) =>
        m.id === id ? { ...m, statut: "revoque" } : m,
      ),
    })),
  invite: (data) =>
    set((s) => ({
      members: [
        {
          id: `m-${s.members.length + 1}-${data.email}`,
          name: data.name,
          initials: initials(data.name),
          email: data.email,
          phone: "—",
          role: data.role,
          roleLabel: data.roleLabel,
          site: data.site,
          statut: "invite",
          lastSeen: "",
        },
        ...s.members,
      ],
    })),
}));

export const STATUT_META: Record<
  MemberStatut,
  { label: string; variant: "green" | "amber" | "blue" | "red" }
> = {
  actif: { label: "Actif", variant: "green" },
  suspendu: { label: "Suspendu", variant: "amber" },
  invite: { label: "Invité", variant: "blue" },
  revoque: { label: "Révoqué", variant: "red" },
};
