// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { formatMontant } from '@/aurantir-front-kit/lib/utils'
import { Save, Settings, Bell, DollarSign, Clock, Shield, Building2, Globe } from 'lucide-react'

interface SeuilsApprobation {
  id: string
  entite_id: string
  seuil_solo: number
  seuil_deux_fondateurs: number
}

interface HorairesConfig {
  jour_semaine: number
  heure_debut: string
  heure_fin: string
  est_ferie: boolean
}

export default function ConfigPage() {
  const [seuils, setSeuils] = useState<SeuilsApprobation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('general')
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('seuils_approbation').select('*')
    setSeuils((data || []) as SeuilsApprobation[])
    setLoading(false)
  }

  async function saveSeuils() {
    setSaving(true)
    for (const s of seuils) {
      await supabase.from('seuils_approbation').update({
        seuil_solo: s.seuil_solo,
        seuil_deux_fondateurs: s.seuil_deux_fondateurs,
      }).eq('id', s.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const SECTIONS = [
    { key: 'general', label: 'Général', icon: <Settings size={13} /> },
    { key: 'finance', label: 'Finance', icon: <DollarSign size={13} /> },
    { key: 'securite', label: 'Sécurité', icon: <Shield size={13} /> },
    { key: 'horaires', label: 'Horaires', icon: <Clock size={13} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={13} /> },
  ]

  const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuration</h1>
          <p className="page-subtitle">Paramètres de la plateforme</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Nav latérale */}
        <div className="lg:col-span-1">
          <Card className="p-2 space-y-0.5">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeSection === s.key
                    ? 'bg-blue/10 text-blue'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                {s.icon}{s.label}
              </button>
            ))}
          </Card>
        </div>

        {/* Contenu */}
        <div className="lg:col-span-3 space-y-4">
          {activeSection === 'general' && (
            <Card className="p-6 space-y-6">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Building2 size={14} />Entités</h3>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { nom: 'Sama Digital', couleur: '#AEB8AE', devise: 'FCFA', pays: 'Sénégal' },
                  { nom: 'Aurantir', couleur: '#2D6BFF', devise: 'EUR', pays: 'International' },
                ].map(e => (
                  <div key={e.nom} className="p-4 rounded-xl border border-surface-border space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.couleur }} />
                      <p className="text-sm font-semibold text-text-primary">{e.nom}</p>
                    </div>
                    <p className="text-xs text-text-muted">Devise : {e.devise}</p>
                    <p className="text-xs text-text-muted">Pays : {e.pays}</p>
                    <p className="text-xs text-text-muted">TVA : {e.nom === 'Sama Digital' ? '18% B2B Sénégal' : '0% export'}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-text-muted flex items-center gap-1.5"><Globe size={12} />Timezone & Locale</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="label">Timezone</label>
                    <select className="input" disabled><option>Africa/Dakar (GMT+0)</option></select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">Langue</label>
                    <select className="input" disabled><option>Français (fr-SN)</option></select>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'finance' && (
            <Card className="p-6 space-y-6">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><DollarSign size={14} />Seuils d&apos;approbation des dépenses</h3>
              {loading ? (
                <div className="skeleton h-32 rounded-lg" />
              ) : (
                <div className="space-y-4">
                  {seuils.map((s, i) => (
                    <div key={s.id} className="p-4 rounded-xl border border-surface-border space-y-3">
                      <p className="text-xs font-medium text-text-muted">
                        {s.entite_id === 'a0000000-0000-0000-0000-000000000001' ? 'Sama Digital' : 'Aurantir'}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="label">Seuil approbation solo (FCFA)</label>
                          <input
                            type="number"
                            className="input"
                            value={s.seuil_solo}
                            onChange={e => setSeuils(prev => prev.map((x, j) => j === i ? { ...x, seuil_solo: parseFloat(e.target.value) } : x))}
                            min="0"
                          />
                          <p className="text-2xs text-text-muted">En dessous : Salam seul</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="label">Seuil 2 fondateurs (FCFA)</label>
                          <input
                            type="number"
                            className="input"
                            value={s.seuil_deux_fondateurs}
                            onChange={e => setSeuils(prev => prev.map((x, j) => j === i ? { ...x, seuil_deux_fondateurs: parseFloat(e.target.value) } : x))}
                            min="0"
                          />
                          <p className="text-2xs text-text-muted">Au-dessus : 3 fondateurs requis</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-background-elevated border border-surface-border text-xs text-text-secondary space-y-1">
                        <p>• &lt; {formatMontant(s.seuil_solo)} → Salam seul</p>
                        <p>• {formatMontant(s.seuil_solo)} – {formatMontant(s.seuil_deux_fondateurs)} → Salam + Hamid</p>
                        <p>• &gt; {formatMontant(s.seuil_deux_fondateurs)} → Thierno + Salam + Hamid</p>
                      </div>
                    </div>
                  ))}
                  <Button onClick={saveSeuils} loading={saving} icon={<Save size={13} />}>
                    {saved ? '✓ Sauvegardé' : 'Enregistrer'}
                  </Button>
                </div>
              )}

              <div className="pt-2 border-t border-surface-border space-y-3">
                <h4 className="text-xs font-semibold text-text-muted">Numérotation des documents</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Factures Sama', 'SMD-FAC-YYYY-NNN'],
                    ['Factures Aurantir', 'ANT-FAC-YYYY-NNN'],
                    ['Devis Sama', 'SMD-DEV-YYYY-NNN'],
                    ['Devis Aurantir', 'ANT-DEV-YYYY-NNN'],
                    ['Avoirs Sama', 'SMD-AVO-YYYY-NNN'],
                    ['Rapports', 'RPT-YYYY-NNN'],
                  ].map(([label, format]) => (
                    <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-background-elevated border border-surface-border">
                      <span className="text-text-secondary">{label}</span>
                      <span className="font-mono text-blue">{format}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'securite' && (
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Shield size={14} />Politiques de sécurité</h3>
              <div className="space-y-3">
                {[
                  { label: 'Révocation immédiate', desc: 'Token blacklist — effet 0 secondes', enabled: true },
                  { label: 'Audit trail complet', desc: 'Toutes les actions sont enregistrées', enabled: true },
                  { label: 'Compte Thierno protégé', desc: 'Aucun fondateur ne peut révoquer le super_admin', enabled: true },
                  { label: 'Sessions multi-appareils', desc: 'Limite : 5 sessions actives par compte', enabled: true },
                  { label: 'Expiration automatique', desc: 'Sessions inactives expirées après 30 jours', enabled: true },
                ].map(p => (
                  <div key={p.label} className="flex items-center justify-between p-3 rounded-lg border border-surface-border">
                    <div>
                      <p className="text-xs font-medium text-text-primary">{p.label}</p>
                      <p className="text-2xs text-text-muted">{p.desc}</p>
                    </div>
                    <div className={`w-8 h-4 rounded-full ${p.enabled ? 'bg-green' : 'bg-surface-border'} relative`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${p.enabled ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'horaires' && (
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Clock size={14} />Horaires de travail</h3>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(jour => (
                  <div key={jour} className="flex items-center gap-3 p-3 rounded-lg border border-surface-border">
                    <span className="text-xs text-text-primary w-20">{JOURS[jour]}</span>
                    <input type="time" defaultValue="08:00" className="input py-1 text-xs w-24" />
                    <span className="text-text-muted text-xs">→</span>
                    <input type="time" defaultValue="18:00" className="input py-1 text-xs w-24" />
                    <span className="text-2xs text-green">Travaillé</span>
                  </div>
                ))}
                {[6, 0].map(jour => (
                  <div key={jour} className="flex items-center gap-3 p-3 rounded-lg border border-surface-border opacity-50">
                    <span className="text-xs text-text-muted w-20">{JOURS[jour]}</span>
                    <span className="text-2xs text-text-muted">Week-end — repos</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Bell size={14} />Alertes automatiques</h3>
              <div className="space-y-3">
                {[
                  { label: 'Rappel facture J+1', desc: 'Email poli au client', enabled: true, color: 'text-blue' },
                  { label: 'Rappel facture J+7', desc: 'Email ferme + notification Hamid', enabled: true, color: 'text-amber' },
                  { label: 'Rappel facture J+15', desc: 'Email critique + Hamid doit intervenir', enabled: true, color: 'text-red' },
                  { label: 'Alerte contrat J-30', desc: 'Notification Hamid — renouvellement à prévoir', enabled: true, color: 'text-amber' },
                  { label: 'Alerte contrat J-15', desc: 'Notification Salam — préparer facturation', enabled: true, color: 'text-amber' },
                  { label: 'Rapport hebdomadaire', desc: 'Lundi 8h00 Dakar — envoyé aux 3 fondateurs', enabled: true, color: 'text-violet' },
                ].map(n => (
                  <div key={n.label} className="flex items-center justify-between p-3 rounded-lg border border-surface-border">
                    <div>
                      <p className={`text-xs font-medium ${n.color}`}>{n.label}</p>
                      <p className="text-2xs text-text-muted">{n.desc}</p>
                    </div>
                    <div className={`w-8 h-4 rounded-full ${n.enabled ? 'bg-green' : 'bg-surface-border'} relative flex-shrink-0`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${n.enabled ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}