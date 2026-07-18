// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Formulaire de satisfaction',
  description: 'Partagez votre avis',
}

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}