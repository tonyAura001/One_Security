"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchParametres,
  mergeIdentity,
  type CompanyIdentity,
} from "@/lib/supabase/data/parametres";

/**
 * Identité de l'entreprise pour les documents : ONE_SECURITY (défauts du code)
 * surchargée par les réglages éditables (table Parametre, modifiables par le DG).
 * Rend immédiatement les défauts puis se met à jour avec les valeurs enregistrées.
 */
export function useCompanyIdentity(): CompanyIdentity {
  const { data } = useQuery({
    queryKey: ["parametres"],
    queryFn: fetchParametres,
    staleTime: 60_000,
  });
  return mergeIdentity(data ?? {});
}
