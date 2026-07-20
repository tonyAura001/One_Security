# PilotePME — Rapport de projet détaillé

> Plateforme de pilotage tout-en-un pour **One Security SUARL** (entreprise de sécurité privée, Dakar, Sénégal).
> Document généré le **19 juillet 2026**. État : **en ligne et fonctionnel**.

- **Production** : https://pilotepme-sandy.vercel.app
- **Dépôt** : `github.com/tonyAura001/One_Security` (privé)
- **Chiffres clés** : 46 tables · **100 % couvert par RLS** · 80 policies · 37 migrations · 91 écrans/composants · 73 commits.

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Contexte & objectifs](#2-contexte--objectifs)
3. [Architecture technique](#3-architecture-technique)
4. [Les acteurs (rôles)](#4-les-acteurs-rôles)
5. [Modèle de sécurité (RLS)](#5-modèle-de-sécurité-rls)
6. [Modèle de données](#6-modèle-de-données)
7. [Les modules fonctionnels](#7-les-modules-fonctionnels)
8. [Le tableau de bord](#8-le-tableau-de-bord)
9. [L'éditeur de documents](#9-léditeur-de-documents)
10. [Authentification & comptes](#10-authentification--comptes)
11. [Déploiement & environnements](#11-déploiement--environnements)
12. [État des données](#12-état-des-données)
13. [Ce qui reste à faire](#13-ce-qui-reste-à-faire)
14. [Annexes](#14-annexes)

---

## 1. Résumé exécutif

**PilotePME** est une application web de gestion d'entreprise, **mono-tenant** (dédiée à One Security), qui couvre toute l'opération d'une société de sécurité privée : finances, clients, agents terrain, planning, paie, caisse, maintenance, communication, tâches et messagerie — plus un **éditeur de documents** aux couleurs de la marque.

Points forts de l'implémentation actuelle :

- **100 % Supabase-native** : le navigateur lit/écrit directement PostgreSQL via PostgREST, sécurisé par du **Row-Level Security (RLS)** par rôle. Pas de couche API intermédiaire dans le chemin des données.
- **Chaque bouton écrit réellement en base** (aucune fonction « démo »), et chaque écriture est protégée par RLS — vérifié rôle par rôle.
- **Aucune donnée fictive** : toutes les données de démonstration ont été purgées ; seuls les **67 agents de sécurité réels** (fournis par l'entreprise) subsistent.
- **10 rôles métier** avec navigation et permissions dédiées, plus un mode DG « Voir en tant que ».
- Déploiement continu sur **Vercel** (auto-deploy à chaque push sur `main`).

---

## 2. Contexte & objectifs

One Security produisait sa gestion dans des outils dispersés (Excel, Word, WhatsApp). PilotePME centralise :

- le **portefeuille clients** et les **sites gardés** ;
- l'**effectif terrain** (agents de sécurité) et son **planning / pointage** ;
- la **facturation** (devis, factures, contrats), la **trésorerie** et la **paie** ;
- la **maintenance** du matériel, la **caisse/boutique**, la **communication** ;
- la production des **documents officiels** (devis, factures, rapports, fiches, communiqués).

Contrainte structurante : **mono-locataire** (une seule entreprise), ce qui simplifie le modèle (pas de `companyId` partout) et permet un RLS **par rôle** plutôt que par tenant.

---

## 3. Architecture technique

### 3.1 Stack

| Couche | Technologie |
|---|---|
| Frontend | **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** · **Tailwind CSS v4** · kit UI « Aurantir » vendorisé · Radix UI · TanStack Query · Recharts · TipTap (éditeur riche) |
| Données / Auth / Fichiers | **Supabase** (PostgreSQL + PostgREST + Auth + Storage) — région `eu-west-1` |
| API (repli) | **NestJS 11 + Prisma 7**, déployée sur **Render** (Docker) — conservée en *strangler/fallback*, hors du chemin de données courant |
| Hébergement front | **Vercel** (projet `pilotepme`, auto-deploy sur `main`) |
| CI | GitHub Actions (typecheck + build front ; tests + image de l'API) |

### 3.2 Flux de données (Supabase-native)

```
Navigateur (React)
   │  supabase-js
   ▼
PostgREST  ──(JWT ES256 de l'utilisateur)──▶  PostgreSQL
   │
   └─ RLS : chaque requête est filtrée par le rôle porté dans le JWT
```

Le front appelle des **modules de données** (`src/lib/supabase/data/*.ts`) : un `fetchX()` (mappeur DB → type UI) et des fonctions d'écriture (`createX`, `updateX`…). Les écrans consomment ces fonctions via **TanStack Query** (`useQuery` / `useMutation`).

### 3.3 Authentification

- **Supabase Auth** (email + mot de passe), sessions par **cookies httpOnly:false** (`@supabase/ssr`) — lisibles par le client navigateur.
- `src/proxy.ts` (ex-middleware) rafraîchit la session à chaque requête + garde de routes.
- Le **DAL** (`src/lib/auth/dal.ts`, `getCurrentUser`) lit le profil applicatif depuis la table `User` (RLS « lire sa propre fiche »). Mode `DEMO_AUTH=false` : plus de dépendance à l'API NestJS pour le login.
- Les tokens Supabase sont **ES256** (asymétriques) ; l'API NestJS (repli) les valide via JWKS.

### 3.4 Rendu & navigation

- **Route dynamique unique** : `app/(app)/[screen]/page.tsx` résout une clé d'écran (`ScreenKey`) via un **registre** (`src/components/screens/registry.tsx`).
- La navigation et le contrôle d'accès viennent d'un **RBAC centralisé** : `src/lib/rbac.ts` (source de vérité). `roleMenu(role)` construit la nav, élaguée par une **whitelist `FUNCTIONAL_SCREENS`** (seuls les écrans réellement câblés apparaissent — et sont accessibles par URL via `canAccess`).

### 3.5 Déploiement (bug notable)

⚠️ **Piège Vercel résolu** : les variables `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` avaient été créées en type **« Sensitive »** → non exposées au *build* → jamais inlinées dans le bundle navigateur → client Supabase muet (tous les écrans vides). Corrigé en les recréant **non-sensitive**. Toute `NEXT_PUBLIC_*` doit être *plain*.

---

## 4. Les acteurs (rôles)

10 profils métier, chacun avec sa navigation, son écran d'accueil et ses permissions RLS :

| Rôle (clé) | Fonction | Accès principaux |
|---|---|---|
| **dg** | Directeur Général | **Tout** + « Voir en tant que » (inspecte l'interface de chaque rôle) |
| **rp** | Responsable des Prestations | Opérations, planning, agents, incidents, CRM/contrats |
| **rf** | Responsable Financier | Finance, trésorerie, caisse, CRM |
| **rh** | Ressources Humaines | Recrutement, agents, présences, paie/bulletins |
| **manager** | Manager de secteur | Planning secteur, agents, incidents, rondes, tâches |
| **controleur** | Contrôleur | Rondes, pointage, validation présences, incidents |
| **surveillant** | Surveillant (chef de poste) | Planning site, pointage, main courante, agents du site |
| **juriste** | Juriste | Contrats, conformité, contentieux, réclamations |
| **comptable** | Comptable | Trésorerie, factures, relances, export paie |
| **agent** | Agent de sécurité (terrain) | Planning, pointage, main courante, documents |

**Voir en tant que (DG)** : le store de session distingue `actualRole` (vraie identité) et `role` (rôle affiché). Le DG change l'UI de n'importe quel rôle, mais l'accès aux **données** reste celui du DG (JWT réel → RLS) : seule l'interface change.

---

## 5. Modèle de sécurité (RLS)

- **RLS activé sur les 46 tables (100 %)** — *deny-by-default*. 80 policies.
- Fonction pivot **`public.current_app_role()`** : renvoie le rôle **en MAJUSCULE** depuis `auth.jwt() → app_metadata → role` (le JWT porte le rôle en minuscule, l'enum et les policies sont en MAJUSCULE).
- Convention : `using ( public.current_app_role() in ('DG','RF',…) )` pour la lecture ; `with check (…)` pour l'écriture (INSERT/UPDATE).
- **Détection des refus** : PostgREST renvoie *204 (0 ligne)* quand la RLS filtre une écriture, pas un 403 → les fonctions d'écriture font `.select()` et lèvent un message clair si 0 ligne.
- **Historique** : un correctif critique a fermé une faille où **34 tables étaient lisibles/modifiables via la clé anon** (pas de RLS à l'origine).

Chaque module a des policies dédiées, par exemple :

| Table | Lecture | Écriture |
|---|---|---|
| `AgentSecurite` | DG/RP/MANAGER/CONTROLEUR/SURVEILLANT/RH | insert/update DG/RP/RH/MANAGER |
| `Facture`, `Encaissement`, `Depense` | DG/RF/COMPTABLE/RP/MANAGER | DG/RF/COMPTABLE |
| `Prospect` | DG/RP/MANAGER | insert DG/RP/MANAGER |
| `Pointage`, `RondeAgent` | ops | DG/RP/MANAGER/CONTROLEUR(/SURVEILLANT/AGENT) |
| `BulletinPaie` | DG/RF/COMPTABLE/RH | DG/RF/RH |
| `Document` | DG/RP/RF/RH/COMPTABLE/MANAGER | delete DG/RP |

---

## 6. Modèle de données

46 tables. Regroupées par domaine (extrait) :

- **Personnel terrain** : `AgentSecurite` (les 67 agents réels ; distincte de `User`), `BulletinPaie`, `AvanceSalaire`.
- **Utilisateurs & droits** : `User` (comptes applicatifs), `Role`, `Permission`, `RolePermission`, `UtilisateurRole`.
- **CRM** : `Client`, `Contact`, `Site`, `Prospect`.
- **Finance** : `Facture`, `Devis`, `DevisLigne`, `Contrat`, `CompteBancaire`, `Encaissement`, `Depense`, `Banque`, `Fournisseur`.
- **Opérations** : `Pointage`, `RondeAgent`, `IncidentSecurite`, `Checkpoint`.
- **Maintenance** : `Ticket`, `Intervention`, `Materiel`.
- **Recrutement** : `Poste`, `Candidat`, `Candidature`, `Entretien`.
- **Caisse/Boutique** : `Produit`, `TicketCaisse`.
- **Communication / collaboration** : `Publication`, `Canal`, `Message`, `Tache`, `Commentaire`, `Fichier`.
- **Documents** : `Document` (contenu structuré en JSON).
- **Tables de liaison** (many-to-many Prisma) : `_ContratAgents`, `_ContratMateriels`, `_IncidentIntervenants`, `_CanalMembres`.

**Points d'attention techniques** :

- Prisma génère `id (@default(uuid()))` et `updatedAt (@updatedAt)` **côté application** → pas de défaut en base. Pour permettre les INSERT PostgREST, on ajoute en base : `alter column id set default gen_random_uuid()` et `updatedAt set default now()`.
- Les liens `Pointage.agentId`, `RondeAgent.agentId`, `BulletinPaie.agentId` ont été **repointés de `User` vers `AgentSecurite`** (les vrais agents), car la table `User` ne contient que les comptes applicatifs.

---

## 7. Les modules fonctionnels

Chaque module suit le même patron : **écrans réels** (données Supabase), **création/édition** via formulaires (dialogs), **RLS par rôle**, **états vides propres**. Tous vérifiés en REST (le bon rôle écrit, un rôle non autorisé est refusé).

### 7.1 Finance & Facturation
- **Factures** : liste + onglets **Devis** et **Contrats**. Création de facture (client, HT/TVA 18 %/TTC calculés), de devis, de contrat.
- **Trésorerie** : comptes multi-supports (banque, Wave, Orange Money, caisse), **création de compte**, **mouvements** (encaissement rattaché à une facture / dépense), graphe d'évolution du solde, **export CSV**.
- **Paiements & Relances** : factures en retard, KPIs dérivés (total en retard, retard moyen, mises en demeure), bouton **« Relancer »** réel (écrit la relance).
- **Export paie bancaire / Bulletins** : **« Générer la paie »** crée un bulletin par agent actif (brut → IPRES 5,6 % + CSS 3,6 % + IR → net), **export CSV**.

### 7.2 Fournisseurs
Création de fournisseur (catégorie, statut, contact, délai). Encours et factures à payer dérivés des dépenses non réglées.

### 7.3 CRM Clients
- **Clients** : portefeuille, création de client, **ajout de site** (rattaché au client), « Appeler » = vrai lien `tel:`.
- **Prospects** : pipeline kanban (glisser-déposer persiste l'étape), création de prospect.

### 7.4 Agents & Opérations
- **Agents** : annuaire des **67 agents réels**, création, édition (par les responsables), « Appeler ».
- **Planning** : roster des 67 agents, **affectation de vacations** (jour/nuit/renfort, jour, site optionnel).
- **Pointage** : bouton **« Pointer »** réel (Arrivée → Départ selon l'état) — écrit un vrai `Pointage`.
- **Présences** : feuille de présence dérivée des pointages (statut *Non pointé* tant qu'aucun pointage).
- **Incidents / main courante** : création d'incident (type enum, criticité, description).

### 7.5 RH & Paie
- **Recrutement** : Postes → Candidatures → funnel de statuts (nouveau → présélection → entretien → offre → embauche/refusé) ; création de poste et de candidature.
- **Entretiens** : agenda réel, **« Planifier un entretien »**, **« Retenir »** (→ embauche) / **« Écarter »** (→ refusé).
- **Paie** : voir 7.1 (génération de bulletins).

### 7.6 Caisse / Boutique
- **Catalogue** (équipements `Materiel`) : « Nouvelle référence ».
- **Stock** (`Produit`) : « Nouveau produit » + « Entrée de stock » (ajuste la quantité).
- **Reçus** (`TicketCaisse`) : mini-POS **« Nouvelle vente »** (produit + quantité + paiement → reçu **et décrément du stock**), impression.

### 7.7 Maintenance
- **Tickets** (kanban) : « Nouveau ticket » (titre, criticité, site optionnel) ; le glisser-déposer persiste le statut.
- **Interventions** : « Nouvelle intervention », **« Clôturer »** (statut terminé), **« Rapport »** (édition du compte rendu).

### 7.8 Communication
- **Calendrier éditorial** : « Nouvelle publication » (titre, canal LinkedIn/Facebook/Instagram/Site web, statut, date, contenu).

### 7.9 Tâches
Création de tâche (titre, priorité, échéance, **assignée à** un membre), coche *terminé* persistée.

### 7.10 Messagerie
Canaux + messages en temps réel (auteur = utilisateur courant), **création de canal**, état vide géré.

---

## 8. Le tableau de bord

Tableau de bord DG « 360° », alimenté par des **agrégats réels multi-domaines** (`fetchDashboardKpis`) :

- **Santé financière** (4 KPI) : CA du mois, taux de recouvrement, masse salariale, factures en retard.
- **📈 Évolution de la trésorerie** : graphique en courbe/aire du **solde cumulé par mois**, calculé à partir des comptes + mouvements.
- **Opérationnel** (4 KPI) : agents en service (67), contrats expirant < 30 j, tickets maintenance, tâches en retard.

Les cartes peu utiles (stock, statut caisse, CA boutique, score CRM) ont été retirées pour un dashboard épuré.

---

## 9. L'éditeur de documents

Fonctionnalité premium (chantier en cours, incréments livrés 1 et 2) : produire les documents officiels One Security **dans la plateforme**.

### 9.1 Charte (source de vérité : `src/lib/one-security.ts`)
Extraite des documents réels : **ONE SECURITY SUARL**, slogan *« Professionnalisme – Rigueur – Respect »*, bleu marine `#1F3A5F` + or `#B8912F`, coordonnées, mentions **RCCM SN-DKR-2025-M-21898 / Ninéa 008777528 / capital 1 000 000 F CFA**, PDG *M. Ousmane Malick Ndiaye*, cachet rond.

### 9.2 Les 5 gabarits
Rendus fidèles aux PDF fournis, en composants React print-ready (A4) : **Devis**, **Facture proforma** (HT/TVA/TTC + options armes/cynophile/GFU), **Rapport de sécurité**, **Fiche d'engagement**, **Communiqué officiel**.

### 9.3 Fonctionnement
- **Gabarits à champs** pour devis/facture (lignes, **calculs HT/TVA/TTC automatiques**).
- **Éditeur rich-text TipTap** pour les textes libres (rapport, communiqué, consignes de la fiche) : gras, italique, souligné, titres, listes, annuler/rétablir.
- **Aperçu A4 en direct** + **export PDF** (impression navigateur, CSS print A4) + **enregistrement** (table `Document`, contenu en JSON, RLS).

### 9.4 Décisions & roadmap
- Décidé : gabarits + rich-text, **signature intégrée maison**, collaboration temps réel **plus tard**.
- **Reste** : fusion des données client (auto-remplissage) + historique de versions ; puis PDF serveur + envoi email + signature ; puis collaboration temps réel. Le **logo/cachet** sont recréés en CSS (à remplacer par les images officielles).

---

## 10. Authentification & comptes

- **10 comptes de test** de rôle : `<role>@pilotepme.test` (dg, rp, rf, rh, manager, controleur, surveillant, juriste, comptable, agent). Mot de passe de test commun **`PilotePME2026!`**.
  > ⚠️ Ce sont des comptes de **test/démo** : à supprimer/renommer et à re-sécuriser avant une mise en production réelle.
- Modèle **sur invitation** (pas de self-signup public).
- Bouton **« Se déconnecter »** dans le pied de la sidebar (Server Action `logout()`).

---

## 11. Déploiement & environnements

- **Front** : Vercel, projet `pilotepme`, alias stable **pilotepme-sandy.vercel.app**, auto-deploy à chaque push sur `main` (build ~45–60 s).
- **DB / Auth / Storage** : Supabase (projet `wypoifuwyylvbzuwmuct`, région eu-west-1).
- **API NestJS** (repli) : Render (Docker), connexion via le pooler eu-west-1 (IPv4).
- **CI** : GitHub Actions (typecheck + build front ; tests + image API).
- **Migrations** : 37 fichiers dans `supabase/migrations/` (schéma uniquement — jamais de données personnelles committées).

---

## 12. État des données

- **67 agents de sécurité réels** (table `AgentSecurite`) — communiqués par l'entreprise, éditables en plateforme par les responsables. **Non committés dans git** (données personnelles).
- **Toutes les autres données de démo ont été purgées** module par module : finance, fournisseurs, clients/sites, prospects, pointages/rondes/tickets/interventions/incidents, recrutement, caisse, publications, tâches, messagerie.
- La plateforme démarre donc « vierge » (hors agents), prête à être peuplée par les vraies données via les formulaires.

---

## 13. Ce qui reste à faire

**Fonctionnel**
- Éditeur de documents : fusion données client, historique de versions, PDF serveur, signature intégrée, envoi email, collaboration temps réel.
- Repeuplement : saisir les vrais clients → sites → contrats → factures, etc.
- Modules encore masqués (non câblés) : contrats juridiques, conformité CNAPS, contentieux, satisfaction/audits, projets/déploiements, bibliothèque, notes, rapports avancés, POS/clôture caisse — à câbler si besoin.

**Sécurité (fin de projet)**
- **Régénérer le mot de passe DB Supabase** + la clé `service_role` (exposés en session de travail).
- Supprimer/rotater les comptes de test.
- Régénérer les types TypeScript officiels via `supabase gen types`.

---

## 14. Annexes

### Structure du dépôt (extraits)
- `src/lib/rbac.ts` — rôles, menus, contrôle d'accès (source de vérité).
- `src/lib/supabase/data/*.ts` — modules de données (fetch + write) par domaine.
- `src/components/screens/**` — écrans (résolus par `registry.tsx`).
- `src/components/documents/**` — gabarits + éditeur de documents.
- `src/lib/one-security.ts` — charte One Security.
- `supabase/migrations/*.sql` — 37 migrations (schéma + RLS).

### Comptes de test
`dg@` `rp@` `rf@` `rh@` `manager@` `controleur@` `surveillant@` `juriste@` `comptable@` `agent@` `pilotepme.test` — mot de passe `PilotePME2026!`.

### Points de vigilance
- Les `NEXT_PUBLIC_*` sur Vercel doivent rester **non-sensitive** (sinon bundle client vide).
- `formatDateFR` renvoie « — » sur une date absente/invalide (protège tous les écrans d'un crash de rendu).
- Toute écriture PostgREST vérifie le refus RLS (0 ligne) et remonte un message clair.

---

*Rapport généré automatiquement à partir de l'état réel du dépôt et de la base au 19/07/2026.*
