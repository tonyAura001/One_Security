# PilotePME — Rétroplanning d'exécution (vers une v1 « classe mondiale »)

> Proposition de plan structuré, jalonné et priorisé pour finaliser PilotePME.
> Établi le 20/07/2026 à partir de l'**état réel** du code et de la base.

---

## 0. Principe de méthode

- **Vertical slices** : chaque jalon livre une valeur testable de bout en bout (migration → types → couche data → UI → tests → déploiement), jamais un demi-morceau.
- **Definition of Done (DoD) commune** à chaque jalon :
  1. Migration SQL idempotente + RLS + défauts DB.
  2. Types TS à jour (à terme via `supabase gen types` en CI).
  3. Couche data (`fetch/create/update`) avec gestion du refus RLS.
  4. UI premium (états vides, erreurs, chargement, responsive, thème clair/sombre).
  5. Tests (unitaires data/logique + e2e du parcours critique).
  6. Déployé en prod + vérifié (bon rôle écrit / rôle non autorisé refusé).
- **Sizing** : `S` ≈ 1 session · `M` ≈ 2–3 sessions · `L` ≈ multi-sessions. La durée calendaire dépend de la cadence ; en sprints de 2 semaines, l'ensemble tient sur **~6 sprints**.
- **On challenge l'existant** quand c'est justifié (voir §2), sans casser ce qui marche.

---

## 1. État des lieux (ce qui EST vs ce que la liste suppose)

| Domaine demandé | Réalité actuelle | Nature du travail |
|---|---|---|
| Tâches (Tache, **Projet**, **Commentaire**) | `Tache` ✅ · `Commentaire` (table présente, **non câblée**) · **`Projet` inexistant** | Approfondir : ajouter Projet + câbler Commentaire |
| Maintenance (**Equipement**, Ticket, Intervention, **PlanMaintenance**) | `Ticket`/`Intervention` ✅ · `Materiel` (≈Equipement) ✅ · **`PlanMaintenance` inexistant** | Ajouter la maintenance préventive (plans, échéancier) |
| Caisse/POS (Produit, **Vente**, **LigneVente**, **Paiement**) | `Produit` ✅ · `TicketCaisse` (vente **agrégée**, mono-ligne) · **pas de LigneVente ni Paiement** | **Re-modéliser** en vraie vente multi-lignes + paiements |
| Community Mgmt (**Plateforme**, Publication, **Interaction**, Planning) | `Publication` ✅ · **Plateforme/Interaction inexistants** | Approfondir : multi-plateformes + interactions/KPIs |
| Upload fichiers | `files.ts` partiel (CV candidatures + photos agents, bucket `pilotepme-files`) | Généraliser + composant intuitif |
| Dashboards | Dashboard DG (KPIs + courbe trésorerie) ✅ | Étendre (par domaine + consolidé) |
| Exports | CSV (trésorerie, paie) ✅ | Ajouter Excel (xlsx) + PDF + automatisation |
| `DEMO_AUTH=false` | **Déjà fait** ✅ | — |
| Types via `supabase gen types` | Actuellement par **introspection** | Basculer sur la génération officielle (voir blocages) |

> **Conclusion** : ~80 % de la couverture fonctionnelle est déjà en place. Le chantier restant = **profondeur du modèle**, **fichiers**, **reporting**, **finition éditeur de documents**, **qualité/sécurité/CI**, **documentation**.

---

## 2. Décisions d'architecture à trancher (je recommande)

1. **Dualité `AgentSecurite` vs `User`** — assumée : `User` = comptes applicatifs (10) ; `AgentSecurite` = effectif terrain (67). ✅ *Garder*, mais documenter clairement (source de confusion pour la TMA).
2. **Planning « shift » vs `RondeAgent`** — aujourd'hhui `RondeAgent` sert à la fois de *ronde/patrouille* et de *vacation planifiée*. **Recommandation** : introduire une entité **`Vacation`** propre (agent, site, créneau, type) distincte de la *ronde de contrôle*. Modèle plus clair et évolutif.
3. **Messagerie** — aujourd'hui `Canal` + `Message` uniquement. **Recommandation** : abstraction **`Conversation`** (type = canal **ou** direct 1-1) + `Participant`, `Message` pointant sur `Conversation`. Unifie groupes et DM.
4. **POS** — passer de `TicketCaisse` agrégé à **`Vente` + `LigneVente` + `Paiement`** (paiements multiples, remboursements, clôture de caisse). Migration + backfill.
5. **Types générés** — passer de l'introspection maison à `supabase gen types` **dans la CI** (nécessite un token — voir §6).

---

## 3. Points de blocage (nécessitent une action de votre côté)

| # | Blocage | Action attendue | Impact si non levé |
|---|---|---|---|
| B1 | **Rotation mot de passe DB + clé `service_role`** | À faire dans le dashboard Supabase (je ne peux pas). Me communiquer la nouvelle chaîne de connexion, ou la re-saisir sur Render/CI. | Sécurité prod |
| B2 | **`supabase gen types`** | Fournir un **access token Supabase** (ou faire `supabase login`) pour automatiser en CI. | Types officiels |
| B3 | **Signature électronique** (option prestataire) | Compte + clés Docusign/Yousign — sinon on reste sur la **signature intégrée maison** (déjà décidée). | Éditeur doc §Phase 5 |
| B4 | **Envoi d'emails** (exports/documents) | Compte **Resend** (ou SMTP) + clé API. | Automatisation reporting |
| B5 | **Monitoring** | DSN **Sentry** (optionnel mais recommandé). | Observabilité |
| B6 | **Logo + cachet** One Security en image (PNG/SVG) | Me les fournir. | Rendu pixel-perfect des documents |
| B7 | **Comptes de test** | Valider leur suppression avant prod. | Sécurité prod |

> Tout le reste (Phases 0→4, doc) est **réalisable sans blocage** — on démarre en parallèle pendant que B1/B2 sont traités.

---

## 4. Phases & jalons

### Phase 0 — Socle qualité (fondations) · `M`
- **J0.1** — Framework de tests : **Vitest** (unitaire, couche data/logique) + **Playwright** (e2e des parcours critiques par rôle). *DoD : `pnpm test` vert en local + CI.*
- **J0.2** — CI/CD durcie : lint + typecheck + tests + build sur chaque PR, **preview deploys** Vercel, gate de merge. Documentée.
- **J0.3** — Génération de types officielle (`supabase gen types`) intégrée en CI (dépend de **B2**).

### Phase 1 — Re-modélisation & unification · `L`
- **J1.1** — **Planning unifié** : entité `Vacation` (+ garder `RondeAgent` pour les rondes), migration, RLS, refactor de l'écran Planning + affectation. *(§2.2)*
- **J1.2** — **Messagerie unifiée** : `Conversation` (canal/direct) + `Participant`, refactor. *(§2.3)*
- **J1.3** — **POS re-modélisé** : `Vente` + `LigneVente` + `Paiement` (+ clôture de caisse), migration/backfill. *(§2.4)*
- **J1.4** — **Tâches/Projets** : entité `Projet` + câblage `Commentaire` (fil de discussion sur tâche/projet).
- **J1.5** — **Maintenance préventive** : `PlanMaintenance` (récurrence, échéancier, génération auto de tickets).
- **J1.6** — **Community Mgmt** : `Plateforme` (comptes réseaux) + `Interaction` (engagement) + calendrier enrichi.

### Phase 2 — Fichiers & Storage · `M`
- **J2.1** — Système d'upload générique : bucket + policies par dossier/rôle, **composant drag-and-drop** premium (aperçu, progression, URLs signées), branché sur clients/agents/documents/tickets/paie.

### Phase 3 — Reporting & tableaux de bord · `M`
- **J3.1** — Dashboards par domaine (Finance, Ops, RH…) + vue **direction consolidée**, indicateurs clés lisibles.
- **J3.2** — **Exports Excel (xlsx)** + **PDF** paramétrables (période, périmètre, colonnes).
- **J3.3** — **Automatisation** : **Vercel Cron** → génération programmée + envoi email (dépend de **B4**).

### Phase 4 — Éditeur de documents (finition) · `L`
- **J4.1** — Fusion des données client (auto-remplissage) + **historique de versions** (snapshots, diff, restauration).
- **J4.2** — **PDF serveur** haute-fidélité (Puppeteer/Vercel) + **envoi email** + **signature intégrée** (dessin/upload + cachet, horodatage, audit). Images officielles (**B6**).
- **J4.3** — Collaboration temps réel (Yjs + Supabase Realtime) — *optionnel/dernier*.

### Phase 5 — Sécurité & durcissement prod · `M`
- **J5.1** — Rotation secrets (**B1**), suppression comptes de test (**B7**), revue RLS exhaustive (matrice rôle×table), **audit trail** (journal des accès/écritures sensibles).
- **J5.2** — Monitoring (**B5**), quotas, politique de rétention Storage, sauvegardes vérifiées.

### Phase 6 — Documentation & transition TMA · `M`
- **J6.1** — **Guide utilisateur** (par rôle, parcours, captures, bonnes pratiques).
- **J6.2** — **Manuel d'administration** (architecture, déploiement, monitoring, maintenance, runbooks d'incident).
- **J6.3** — **Spécifications techniques** exhaustives (modèle de données, RLS, API, conventions).
- **J6.4** — **Plan de transition TMA** (onboarding, backlog, SLA, procédures d'astreinte).

---

## 5. Séquencement recommandé (par sprint indicatif)

| Sprint | Contenu | Objectif |
|---|---|---|
| **S1** | J0.1 · J0.2 (+ B1/B2 côté client) · J1.1 | Socle qualité + 1ère re-modélisation (Planning) |
| **S2** | J0.3 · J1.2 · J1.3 | Types officiels + Messagerie + POS |
| **S3** | J1.4 · J1.5 · J1.6 | Tâches/Projets + Maintenance préventive + CM |
| **S4** | J2.1 · J3.1 | Fichiers + Dashboards |
| **S5** | J3.2 · J3.3 · J4.1 | Exports/automatisation + Doc (versions/fusion) |
| **S6** | J4.2 · J5.1 · J5.2 · J6.* | PDF/signature + durcissement + documentation |

> Ordre **modulable** selon vos priorités business (ex. si le reporting direction est urgent, on remonte la Phase 3).

---

## 6. Indicateurs de suivi (qualité & avancement)

- **Avancement** : jalons livrés / total, par phase.
- **Qualité** : couverture de tests (cible ≥ 60 % sur la couche data + parcours e2e critiques), 0 régression CI, build vert.
- **Sécurité** : 100 % tables RLS (déjà atteint), matrice rôle×accès vérifiée, secrets rotés.
- **UX** : chaque écran a état vide/erreur/chargement, responsive, thème clair/sombre, actions réelles (0 bouton factice).
- **Perf** : temps de build, taille bundle, Web Vitals (Lighthouse).

---

## 7. Risques & mitigations

| Risque | Mitigation |
|---|---|
| Re-modélisation (POS/Planning/Messagerie) casse l'existant | Migrations idempotentes + backfill + tests e2e avant/après ; feature-flag si besoin |
| Blocages secrets (B1/B2) retardent la CI types/sécurité | Démarrer Phases 0/1/2 en parallèle ; ces blocages n'empêchent pas le fonctionnel |
| Dépendances externes (e-sign, email) indisponibles | Fallbacks maison (signature intégrée, export téléchargeable) déjà prévus |
| Périmètre qui s'élargit | Jalons à DoD stricte ; on ne démarre J(n+1) qu'après J(n) livré+déployé |

---

## 8. Ma recommandation immédiate

Démarrer sans attendre les blocages :
1. **J0.1 + J0.2** (socle de tests + CI durcie) — condition de la « non-régression » que vous demandez.
2. **J1.1** (unification Planning) — la re-modélisation la plus structurante.

Pendant ce temps, côté vous : **B1** (rotation secrets), **B2** (token Supabase), **B6** (logo/cachet).

Validez l'ordre (ou re-priorisez), fournissez les éléments B1/B2/B6, et je lance le premier jalon.
