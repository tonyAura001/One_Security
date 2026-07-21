export interface MessagePiece {
  chemin: string;
  type: string; // mime
  nom: string;
  taille: number;
}

export interface ChatLine {
  from: "me" | "them";
  text: string;
  time: string; // HH:MM
  createdAt?: string; // ISO (séparateurs de date, ordre)
  piece?: MessagePiece;
}

export interface Conversation {
  id: string;
  name: string;
  subtitle: string;
  initials: string;
  unread: number;
  messages: ChatLine[];
}

export const CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    name: "Cheikh Guèye",
    subtitle: "Chef de contrôle",
    initials: "CG",
    unread: 2,
    messages: [
      {
        from: "them",
        text: "Bonjour, le poste de l'AIBD est-il couvert ?",
        time: "08:12",
      },
      {
        from: "me",
        text: "Oui, deux agents en place depuis 6h.",
        time: "08:14",
      },
      {
        from: "them",
        text: "Parfait. Ronde de nuit RAS également.",
        time: "08:15",
      },
    ],
  },
  {
    id: "c2",
    name: "Équipe superviseurs",
    subtitle: "Groupe · 9 membres",
    initials: "ES",
    unread: 5,
    messages: [
      { from: "them", text: "Briefing à 9h en salle de crise.", time: "07:40" },
      {
        from: "me",
        text: "Bien reçu, je prépare les consignes ramadan.",
        time: "07:42",
      },
    ],
  },
  {
    id: "c3",
    name: "Aïda Ba",
    subtitle: "Secrétaire",
    initials: "AB",
    unread: 0,
    messages: [
      {
        from: "them",
        text: "Le devis Ambassade des USA est parti.",
        time: "Hier",
      },
      { from: "me", text: "Merci, je le mets en validation.", time: "Hier" },
    ],
  },
  {
    id: "c4",
    name: "Ibrahima Sow",
    subtitle: "Mainteneur",
    initials: "IS",
    unread: 0,
    messages: [
      {
        from: "them",
        text: "Portique AIBD réparé, ticket clôturé.",
        time: "Hier",
      },
    ],
  },
  {
    id: "c5",
    name: "Fatou Sarr",
    subtitle: "Comptable",
    initials: "FS",
    unread: 1,
    messages: [
      {
        from: "them",
        text: "Relance Ambassade de France envoyée (J+32).",
        time: "Lun",
      },
    ],
  },
];
