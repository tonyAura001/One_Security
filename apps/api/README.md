# PilotePME — API

Backend de la plateforme de gestion pour **entreprises de sécurité privée**.

## Stack

| Domaine | Choix |
|---|---|
| Framework | NestJS 11 (contrôleurs / services / DI / guards) |
| Langage | TypeScript strict |
| ORM | Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Base | PostgreSQL (Supabase en cible) |
| Auth | Supabase Auth (JWT HS256 vérifié par un guard Nest) |
| Autorisation | RBAC par rôle (`@Roles`) + RLS Supabase (défense en profondeur) |
| Docs | OpenAPI / Swagger → `/api/docs` |
| Validation | class-validator / class-transformer |
| Tests | Jest (unitaires + e2e) |

## Démarrage

```bash
pnpm install
cp .env.example .env          # renseigner DATABASE_URL (+ clés Supabase)
pnpm db:migrate               # applique les migrations Prisma
pnpm start:dev                # http://localhost:4000/api
```

Docs interactives : **http://localhost:4000/api/docs** · Health : `/api/health`.

Scripts : `db:migrate` · `db:deploy` (prod) · `db:generate` · `db:studio` · `db:reset`
Qualité : `pnpm build` · `pnpm test` · `pnpm lint`

## Architecture

```
src/
├── main.ts                 # bootstrap : prefix /api, ValidationPipe, Swagger, CORS
├── app.module.ts           # wiring + guards globaux (JWT puis RBAC)
├── prisma/                 # PrismaService (adapter pg) + module global
├── auth/                   # stratégie JWT Supabase, guards, décorateurs (@Roles, @Public, @CurrentUser)
├── common/                 # DTO transverses (pagination…)
└── incidents/              # module métier (tranche verticale de référence)
    ├── dto/                # Create / Update / Query / ChangeStatut
    ├── incidents.service.ts     # logique métier (main courante)
    ├── incidents.controller.ts  # routes REST + RBAC
    └── incidents.service.spec.ts

prisma/
├── schema.prisma           # modèle de données complet (24 modèles, 20 enums)
└── migrations/             # migrations SQL versionnées
```

## Sécurité (Auth + RBAC + RLS)

1. **Authentification** — chaque requête (hors `@Public`) exige un **JWT Supabase**
   valide (`Authorization: Bearer …`). `JwtStrategy` le vérifie (HS256,
   `SUPABASE_JWT_SECRET`) et construit `req.user` ; le rôle métier vient du claim
   `app_metadata.role`.
2. **Autorisation** — `@Roles(Role.DG, …)` + `RolesGuard` restreignent chaque route.
   L'API est le gardien principal.
3. **RLS Supabase** — activée au niveau base en **défense en profondeur** (à venir
   dans `supabase/`). Le service role de l'API n'est jamais exposé au front.

> `User.id` reprend l'UID `auth.users` de Supabase — pas de mot de passe stocké
> côté application. `Fichier` référence un objet Supabase Storage.

## Modèle de données

24 modèles couvrant Noyau (User, Site, Contrat, Matériel), CRM (Client, Contact,
Prospect, Devis), Finance (Facture, Encaissement, Dépense, CompteBancaire…), RH
(BulletinPaie, AvanceSalaire), Collaboration (Canal, Message, Commentaire) et
Terrain (Pointage, RondeAgent, Checkpoint, IncidentSécurité). Voir
`prisma/schema.prisma`.

## Reste à faire

- Modules CRUD pour les autres entités (sur le patron `incidents/`).
- Migrations `supabase/` : politiques RLS + buckets Storage + trigger de sync
  `auth.users` → `User`.
- Endpoints métier avancés (planning/rondes, génération de factures, KPI dashboards).
- Tests d'intégration (e2e) sur base éphémère.
