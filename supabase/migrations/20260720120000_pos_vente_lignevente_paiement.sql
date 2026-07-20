-- ════════════════════════════════════════════════════════════════════════
-- S2 · J1.3 — Re-modélisation POS : Vente / LigneVente / Paiement
-- ════════════════════════════════════════════════════════════════════════
-- Remplace l'agrégat mono-ligne `TicketCaisse` par un vrai modèle de vente :
--   Vente        : en-tête (ref, caissier, client, total, statut)
--   LigneVente   : N lignes d'articles (snapshot désignation + prix unitaire)
--   Paiement     : 1..N règlements (paiement partagé possible)
-- La création passe par le RPC atomique `create_vente` (SECURITY DEFINER) :
-- en-tête + lignes + paiements + décrément de stock dans une seule transaction,
-- avec garde de stock. RLS : lecture/écriture DG / RF / COMPTABLE.
-- TicketCaisse est vide (0 ligne, aucune FK) → supprimé.

-- ── Tables ───────────────────────────────────────────────────────────────
create table if not exists public."Vente" (
  id          uuid primary key default gen_random_uuid(),
  ref         text not null unique,
  "dateHeure" timestamptz not null default now(),
  "caissierId" uuid references public."User"(id) on delete set null,
  "clientId"  uuid references public."Client"(id) on delete set null,
  total       integer not null default 0,
  statut      text not null default 'PAYEE',
  "createdAt" timestamptz not null default now()
);

create table if not exists public."LigneVente" (
  id            uuid primary key default gen_random_uuid(),
  "venteId"     uuid not null references public."Vente"(id) on delete cascade,
  "produitId"   uuid references public."Produit"(id) on delete set null,
  designation   text not null,
  "prixUnitaire" integer not null default 0,
  quantite      integer not null default 1,
  montant       integer not null default 0,
  "createdAt"   timestamptz not null default now()
);

create table if not exists public."Paiement" (
  id          uuid primary key default gen_random_uuid(),
  "venteId"   uuid not null references public."Vente"(id) on delete cascade,
  moyen       text not null default 'Espèces',
  montant     integer not null default 0,
  reference   text,
  "createdAt" timestamptz not null default now()
);

create index if not exists "LigneVente_venteId_idx" on public."LigneVente"("venteId");
create index if not exists "Paiement_venteId_idx"   on public."Paiement"("venteId");
create index if not exists "Vente_dateHeure_idx"     on public."Vente"("dateHeure" desc);

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public."Vente"      enable row level security;
alter table public."LigneVente" enable row level security;
alter table public."Paiement"   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['Vente','LigneVente','Paiement'] loop
    execute format('drop policy if exists %I on public.%I', t||'_caisse_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_caisse_write', t);
    execute format($f$create policy %I on public.%I for select
      using (current_app_role() = any (array['DG','RF','COMPTABLE']))$f$, t||'_caisse_read', t);
    execute format($f$create policy %I on public.%I for all
      using (current_app_role() = any (array['DG','RF','COMPTABLE']))
      with check (current_app_role() = any (array['DG','RF','COMPTABLE']))$f$, t||'_caisse_write', t);
  end loop;
end $$;

-- ── RPC atomique : création d'une vente complète ─────────────────────────
create or replace function public.create_vente(
  _lines    jsonb,
  _payments jsonb default null,
  _client   uuid  default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _role     text := current_app_role();
  _vente_id uuid := gen_random_uuid();
  _ref      text;
  _total    int  := 0;
  _line     jsonb;
  _pay      jsonb;
  _pid      uuid;
  _qte      int;
  _pu       int;
  _stock    int;
  _nom      text;
begin
  if _role is null or _role not in ('DG','RF','COMPTABLE') then
    raise exception 'accès refusé (rôle caisse requis)' using errcode = '42501';
  end if;
  if _lines is null or jsonb_array_length(_lines) = 0 then
    raise exception 'vente vide';
  end if;

  _ref := 'RC-' || to_char(now(), 'YYYY') || '-' ||
          lpad((floor(random() * 1000000))::int::text, 6, '0');

  -- En-tête d'abord (les lignes/paiements y font référence par FK)
  insert into public."Vente"(id, ref, "caissierId", "clientId", total, statut)
    values (_vente_id, _ref, auth.uid(), _client, 0, 'PAYEE');

  -- Lignes : validation + garde de stock + décrément (verrou ligne produit)
  for _line in select * from jsonb_array_elements(_lines) loop
    _pid := (_line->>'produitId')::uuid;
    _qte := greatest(1, (_line->>'quantite')::int);
    select stock, prix, nom into _stock, _pu, _nom
      from public."Produit" where id = _pid for update;
    if _nom is null then
      raise exception 'produit introuvable : %', _pid;
    end if;
    if _stock < _qte then
      raise exception 'stock insuffisant pour « % » (dispo %, demandé %)', _nom, _stock, _qte;
    end if;
    update public."Produit" set stock = stock - _qte where id = _pid;
    insert into public."LigneVente"(id, "venteId", "produitId", designation, "prixUnitaire", quantite, montant)
      values (gen_random_uuid(), _vente_id, _pid, _nom, _pu, _qte, _pu * _qte);
    _total := _total + _pu * _qte;
  end loop;

  update public."Vente" set total = _total where id = _vente_id;

  -- Paiements : défaut = un règlement espèces couvrant le total
  if _payments is null or jsonb_array_length(_payments) = 0 then
    insert into public."Paiement"(id, "venteId", moyen, montant)
      values (gen_random_uuid(), _vente_id, 'Espèces', _total);
  else
    for _pay in select * from jsonb_array_elements(_payments) loop
      insert into public."Paiement"(id, "venteId", moyen, montant, reference)
        values (gen_random_uuid(), _vente_id,
                coalesce(_pay->>'moyen', 'Espèces'),
                coalesce((_pay->>'montant')::int, 0),
                _pay->>'reference');
    end loop;
  end if;

  return _vente_id;
end;
$$;

grant execute on function public.create_vente(jsonb, jsonb, uuid) to authenticated;

-- ── Retrait de l'ancien agrégat ──────────────────────────────────────────
drop table if exists public."TicketCaisse";
