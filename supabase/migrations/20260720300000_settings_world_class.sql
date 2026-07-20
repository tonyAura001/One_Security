-- ════════════════════════════════════════════════════════════════════════
-- S7 · Paramètres « classe mondiale » — profil self-service + identité visuelle
-- ════════════════════════════════════════════════════════════════════════
-- 1. RPC `update_own_profile` : chaque utilisateur met à jour SES coordonnées
--    (prénom/nom/téléphone) SANS pouvoir toucher son rôle ni son statut actif
--    (SECURITY DEFINER + WHERE id = auth.uid()). Aucune élévation possible.
-- 2. Clés Parametre par défaut pour l'identité visuelle et les textes documents
--    (couleurs de marque, conditions de paiement, mentions légales). Le logo et
--    la signature (data URL) sont écrits à la demande — pas de défaut.
-- L'écriture de Parametre reste réservée DG/RP (policy `parametre_write`).

create or replace function public.update_own_profile(
  p_prenom    text,
  p_nom       text,
  p_telephone text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'non authentifié';
  end if;
  update public."User"
     set prenom    = coalesce(nullif(btrim(p_prenom), ''), prenom),
         nom       = coalesce(nullif(btrim(p_nom), ''), nom),
         telephone = nullif(btrim(p_telephone), '')
   where id = auth.uid();
end;
$$;

revoke all on function public.update_own_profile(text, text, text) from public;
grant execute on function public.update_own_profile(text, text, text) to authenticated;

-- Valeurs par défaut de l'identité visuelle / documents (ne pas écraser)
insert into public."Parametre"(cle, valeur) values
  ('brand_couleur_principale', '#1F3A5F'),
  ('brand_couleur_accent',     '#B8912F'),
  ('brand_theme',              'one'),
  ('doc_conditions_paiement',  'Le règlement de la facture se fera par chèque ou par espèce.'),
  ('doc_mentions_legales',     '')
on conflict (cle) do nothing;
