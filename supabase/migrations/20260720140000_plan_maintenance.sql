-- ════════════════════════════════════════════════════════════════════════
-- S2 · J1.5 — Maintenance préventive : PlanMaintenance
-- ════════════════════════════════════════════════════════════════════════
-- Plans de maintenance récurrents (par équipement/site, périodicité, prochaine
-- échéance). Le RPC `generer_ticket_plan` crée un Ticket depuis un plan et
-- avance l'échéance d'une période — de façon atomique et role-gardée.

create table if not exists public."PlanMaintenance" (
  id             uuid primary key default gen_random_uuid(),
  titre          text not null,
  "siteId"       uuid references public."Site"(id) on delete set null,
  equipement     text,
  periodicite    text not null default 'mensuelle',   -- mensuelle|trimestrielle|semestrielle|annuelle
  "prochaineEcheance" date not null default current_date,
  criticite      text not null default 'normale',     -- critique|haute|normale|basse
  "responsableId" uuid references public."User"(id) on delete set null,
  actif          boolean not null default true,
  notes          text,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now()
);
create index if not exists "PlanMaintenance_echeance_idx"
  on public."PlanMaintenance"("prochaineEcheance");

-- ── RLS (aligné sur Ticket) ──────────────────────────────────────────────
alter table public."PlanMaintenance" enable row level security;
drop policy if exists "Plan_maint_read"  on public."PlanMaintenance";
drop policy if exists "Plan_maint_write" on public."PlanMaintenance";
create policy "Plan_maint_read" on public."PlanMaintenance"
  for select using (current_app_role() = any (array['DG','RP','MANAGER','CONTROLEUR','SURVEILLANT']));
create policy "Plan_maint_write" on public."PlanMaintenance"
  for all
  using (current_app_role() = any (array['DG','RP','MANAGER','CONTROLEUR']))
  with check (current_app_role() = any (array['DG','RP','MANAGER','CONTROLEUR']));

-- ── RPC : générer un ticket depuis un plan + avancer l'échéance ───────────
create or replace function public.generer_ticket_plan(_plan uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _role text := current_app_role();
  _p    public."PlanMaintenance";
  _ref  text;
  _tid  uuid := gen_random_uuid();
  _step interval;
begin
  if _role is null or _role not in ('DG','RP','MANAGER','CONTROLEUR') then
    raise exception 'accès refusé (rôle maintenance requis)' using errcode = '42501';
  end if;
  select * into _p from public."PlanMaintenance" where id = _plan for update;
  if _p.id is null then raise exception 'plan introuvable'; end if;
  if not _p.actif then raise exception 'plan inactif'; end if;

  _ref := 'TCK-' || to_char(now(), 'YYYY') || '-' ||
          lpad((floor(random() * 1000000))::int::text, 6, '0');

  insert into public."Ticket"(id, ref, titre, criticite, stage, "siteId", equipement, "dateOuverture")
    values (_tid, _ref,
            'Préventif — ' || _p.titre,
            _p.criticite, 'ouvert', _p."siteId", _p.equipement, current_date);

  _step := case _p.periodicite
             when 'trimestrielle' then interval '3 months'
             when 'semestrielle'  then interval '6 months'
             when 'annuelle'      then interval '12 months'
             else interval '1 month'
           end;
  update public."PlanMaintenance"
    set "prochaineEcheance" = ("prochaineEcheance" + _step)::date,
        "updatedAt" = now()
    where id = _plan;

  return _tid;
end;
$$;
grant execute on function public.generer_ticket_plan(uuid) to authenticated;
