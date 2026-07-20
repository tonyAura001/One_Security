-- ════════════════════════════════════════════════════════════════════════
-- Lot C · Budget (finance) + Audits de satisfaction (CRM)
-- ════════════════════════════════════════════════════════════════════════

-- Lignes budgétaires (prévu vs réalisé) par période.
create table if not exists public."BudgetLigne" (
  id          uuid primary key default gen_random_uuid(),
  poste       text not null,
  prevu       integer not null default 0,
  realise     integer not null default 0,
  periode     text not null default to_char(now(), 'YYYY-MM'),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
alter table public."BudgetLigne" enable row level security;
drop policy if exists "budget_read"  on public."BudgetLigne";
drop policy if exists "budget_write" on public."BudgetLigne";
create policy "budget_read" on public."BudgetLigne"
  for select using (current_app_role() = any (array['DG','RF','COMPTABLE']));
create policy "budget_write" on public."BudgetLigne"
  for all
  using (current_app_role() = any (array['DG','RF','COMPTABLE']))
  with check (current_app_role() = any (array['DG','RF','COMPTABLE']));

-- Audits de satisfaction par site.
create table if not exists public."SiteAudit" (
  id          uuid primary key default gen_random_uuid(),
  "siteId"    uuid references public."Site"(id) on delete set null,
  auditeur    text,
  score       integer not null default 0,   -- /100
  date        date not null default current_date,
  commentaire text,
  "createdAt" timestamptz not null default now()
);
create index if not exists "SiteAudit_date_idx" on public."SiteAudit"(date desc);
alter table public."SiteAudit" enable row level security;
drop policy if exists "audit_read"  on public."SiteAudit";
drop policy if exists "audit_write" on public."SiteAudit";
create policy "audit_read" on public."SiteAudit"
  for select using (current_app_role() = any (array['DG','RP','MANAGER','RF']));
create policy "audit_write" on public."SiteAudit"
  for all
  using (current_app_role() = any (array['DG','RP','MANAGER']))
  with check (current_app_role() = any (array['DG','RP','MANAGER']));
