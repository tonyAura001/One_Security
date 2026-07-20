-- ════════════════════════════════════════════════════════════════════════
-- S3 · J3.3 — Fonctions pour tâches planifiées (Vercel Cron)
-- ════════════════════════════════════════════════════════════════════════
-- Ces fonctions sont destinées à un appel serveur (clé service_role, qui
-- bypasse le RLS et n'a pas d'app-role) : elles ne font DONC PAS de contrôle
-- current_app_role(). L'EXECUTE est révoqué de public/authenticated/anon et
-- accordé UNIQUEMENT à service_role, pour qu'un utilisateur navigateur ne
-- puisse pas les déclencher.

-- ── 1) Générer les tickets de maintenance préventive dus ─────────────────
create or replace function public.cron_generer_tickets_preventifs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _p    record;
  _n    int := 0;
  _ref  text;
  _step interval;
begin
  for _p in
    select * from public."PlanMaintenance"
    where actif and "prochaineEcheance" <= current_date
    for update
  loop
    _ref := 'TCK-' || to_char(now(), 'YYYY') || '-' ||
            lpad((floor(random() * 1000000))::int::text, 6, '0');
    insert into public."Ticket"(id, ref, titre, criticite, stage, "siteId", equipement, "dateOuverture")
      values (gen_random_uuid(), _ref, 'Préventif — ' || _p.titre,
              _p.criticite, 'ouvert', _p."siteId", _p.equipement, current_date);
    _step := case _p.periodicite
               when 'trimestrielle' then interval '3 months'
               when 'semestrielle'  then interval '6 months'
               when 'annuelle'      then interval '12 months'
               else interval '1 month'
             end;
    update public."PlanMaintenance"
      set "prochaineEcheance" = ("prochaineEcheance" + _step)::date, "updatedAt" = now()
      where id = _p.id;
    _n := _n + 1;
  end loop;
  return _n;
end;
$$;

-- ── 2) Marquer les factures échues en retard ─────────────────────────────
create or replace function public.cron_flag_factures_retard()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare _n int;
begin
  update public."Facture"
    set statut = 'EN_RETARD', "updatedAt" = now()
    where statut in ('EMISE', 'ENVOYEE')
      and "dateEcheance" is not null
      and "dateEcheance" < current_date;
  get diagnostics _n = row_count;
  return _n;
end;
$$;

-- ── Verrouillage des droits d'exécution (service_role uniquement) ─────────
revoke execute on function public.cron_generer_tickets_preventifs() from public;
revoke execute on function public.cron_flag_factures_retard()       from public;
grant  execute on function public.cron_generer_tickets_preventifs() to service_role;
grant  execute on function public.cron_flag_factures_retard()       to service_role;

-- Supabase accorde EXECUTE à anon/authenticated par défaut : révoquer nommément.
revoke execute on function public.cron_generer_tickets_preventifs() from anon, authenticated;
revoke execute on function public.cron_flag_factures_retard()       from anon, authenticated;
