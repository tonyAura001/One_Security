-- ════════════════════════════════════════════════════════════════════════
-- Lot B · Paie — circuit d'approbation réel (CyclePaie)
-- ════════════════════════════════════════════════════════════════════════
-- Remplace le store local par un circuit persisté à 3 niveaux, par période :
--   brouillon → soumis (Responsable Paie : RH/RF/RP)
--            → validé  (Chef de contrôle : CONTROLEUR)
--            → approuvé (Directeur Général : DG)
-- Le RPC `avancer_cycle_paie` fait avancer d'un cran avec garde de rôle par
-- niveau ; crée la ligne au 1er appel.

create table if not exists public."CyclePaie" (
  periode        text primary key,             -- ex. '2026-07'
  statut         text not null default 'brouillon',
  "soumisParId"  uuid references public."User"(id) on delete set null,
  "valideParId"  uuid references public."User"(id) on delete set null,
  "approuveParId" uuid references public."User"(id) on delete set null,
  "soumisLe"     timestamptz,
  "valideLe"     timestamptz,
  "approuveLe"   timestamptz,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now()
);

alter table public."CyclePaie" enable row level security;
drop policy if exists "cyclepaie_read" on public."CyclePaie";
create policy "cyclepaie_read" on public."CyclePaie"
  for select using (
    current_app_role() = any (array['DG','RF','COMPTABLE','RH','RP','CONTROLEUR'])
  );

create or replace function public.avancer_cycle_paie(_periode text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _role text := current_app_role();
  _cur  text;
begin
  select statut into _cur from public."CyclePaie" where periode = _periode;
  if _cur is null then
    insert into public."CyclePaie"(periode, statut) values (_periode, 'brouillon');
    _cur := 'brouillon';
  end if;

  if _cur = 'brouillon' then
    if _role not in ('RH','RF','RP','DG') then
      raise exception 'accès refusé (Responsable Paie requis)' using errcode = '42501';
    end if;
    update public."CyclePaie"
      set statut='soumis', "soumisParId"=auth.uid(), "soumisLe"=now(), "updatedAt"=now()
      where periode=_periode;
    return 'soumis';
  elsif _cur = 'soumis' then
    if _role not in ('CONTROLEUR','DG') then
      raise exception 'accès refusé (Chef de contrôle requis)' using errcode = '42501';
    end if;
    update public."CyclePaie"
      set statut='valide', "valideParId"=auth.uid(), "valideLe"=now(), "updatedAt"=now()
      where periode=_periode;
    return 'valide';
  elsif _cur = 'valide' then
    if _role <> 'DG' then
      raise exception 'accès refusé (Directeur Général requis)' using errcode = '42501';
    end if;
    update public."CyclePaie"
      set statut='approuve', "approuveParId"=auth.uid(), "approuveLe"=now(), "updatedAt"=now()
      where periode=_periode;
    return 'approuve';
  else
    raise exception 'cycle déjà approuvé pour %', _periode;
  end if;
end;
$$;
grant execute on function public.avancer_cycle_paie(text) to authenticated;
