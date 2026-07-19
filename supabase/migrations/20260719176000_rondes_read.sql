-- Migration #24 — Planning : lecture des rondes (RondeAgent).
alter table public."RondeAgent" alter column id set default gen_random_uuid();
drop policy if exists "rondes_read_ops" on public."RondeAgent";
create policy "rondes_read_ops" on public."RondeAgent" for select to authenticated
  using ( public.current_app_role() in ('DG','RP','MANAGER','CONTROLEUR','SURVEILLANT') );
alter table public."RondeAgent" alter column "updatedAt" set default now();
