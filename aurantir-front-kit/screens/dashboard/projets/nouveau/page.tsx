// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { uploadToStorage } from '@/aurantir-front-kit/lib/storage'
import { ChevronRight, Save, Users, Paperclip, FileText, X, Code2, GitBranch, Pen, Check, FileSignature, Clock, Layers, Building2, FolderTree } from 'lucide-react'

const POPULAR_STACKS = [
  'React', 'Next.js', 'Angular', 'Vue.js', 'Svelte',
  'Node.js', 'Express', 'NestJS', 'PHP', 'Laravel', 'Symfony',
  'Python', 'Django', 'FastAPI', 'Flutter', 'React Native',
  'TypeScript', 'JavaScript', 'MySQL', 'PostgreSQL', 'MongoDB',
  'Supabase', 'Firebase', 'AWS', 'Docker', 'Figma',
]

export default function NouveauProjetPage() {
  return (
    <Suspense fallback={<div className="space-y-4 animate-fade-up max-w-2xl mx-auto"><div className="skeleton h-8 w-48 rounded" /><div className="skeleton h-96 rounded-xl" /></div>}>
      <NouveauProjetContent />
    </Suspense>
  )
}

function NouveauProjetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const parentParam = searchParams.get('parent') || ''
  const { entiteActive } = useAppStore()
  const [form, setForm] = useState({
    titre: '', description: '', statut: 'planifie',
    priorite: 'normale', date_debut: '', date_fin_prevue: '',
    budget_prevu: '', heures_prevues: '', client_id: '',
    chef_projet_id: '', contrat_id: '',
    depot_git: '', lien_design: '',
    type_projet: 'classique' as 'classique' | 'special',
    parent_id: parentParam,
  })
  const [clientIds, setClientIds] = useState<string[]>([])
  const [clients, setClients] = useState<{ id: string; nom_entreprise: string }[]>([])
  const [membres, setMembres] = useState<{ id: string; prenom: string; nom: string; role: string }[]>([])
  const [contrats, setContrats] = useState<{ id: string; titre: string; numero: string }[]>([])
  const [projetsParents, setProjetsParents] = useState<{ id: string; titre: string; client_id: string | null; contrat_id: string | null }[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [stack, setStack] = useState<string[]>([])
  const [stackInput, setStackInput] = useState('')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const projetParent = projetsParents.find(p => p.id === form.parent_id) || null

  useEffect(() => {
    if (!entiteActive?.id) return
    Promise.all([
      supabase.from('entreprises_clientes').select('id, nom_entreprise').eq('entite_id', entiteActive.id).order('nom_entreprise'),
      supabase.from('users').select('id, prenom, nom, role').in('role', ['super_admin', 'fondateur', 'manager']).eq('statut', 'actif').order('prenom'),
      supabase.from('contrats').select('id, titre, numero').eq('entite_id', entiteActive.id).order('created_at', { ascending: false }),
      supabase.from('projets').select('id, titre, client_id, contrat_id').eq('entite_id', entiteActive.id).order('titre'),
    ]).then(([{ data: c }, { data: m }, { data: ct }, { data: pp }]) => {
      setClients(c || [])
      setMembres(m || [])
      setContrats(ct || [])
      setProjetsParents((pp || []) as { id: string; titre: string; client_id: string | null; contrat_id: string | null }[])
    })
    setForm(f => ({ ...f, date_debut: new Date().toISOString().split('T')[0] }))
  }, [entiteActive])

  function selectParent(parentId: string) {
    const parent = projetsParents.find(p => p.id === parentId)
    setForm(f => ({
      ...f,
      parent_id: parentId,
      client_id: parent?.client_id || f.client_id,
      contrat_id: parent?.contrat_id || f.contrat_id,
    }))
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    e.target.value = ''
    if (selected.length > 0) setFiles(prev => [...prev, ...selected])
  }
  function removeFile(idx: number) { setFiles(prev => prev.filter((_, i) => i !== idx)) }
  function toggleStack(tech: string) {
    setStack(prev => prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech])
  }
  function addCustomTech() {
    const t = stackInput.trim()
    if (t && !stack.includes(t)) { setStack(prev => [...prev, t]); setStackInput('') }
  }
  function toggleTeam(id: string) {
    setTeamIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  async function submit() {
    if (!form.titre.trim() || !entiteActive?.id) return
    setError('')
    setSaving(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setError('Session expirée.'); setSaving(false); return }

    const { data: userData, error: userError } = await supabase
      .from('users').select('id').eq('auth_user_id', authUser.id).single()
    if (userError || !userData) { setError('Profil introuvable.'); setSaving(false); return }

    const isSpecial = form.type_projet === 'special'
    const { data, error: insertError } = await supabase.from('projets').insert({
      entite_id: entiteActive.id,
      titre: form.titre.trim(),
      description: form.description.trim() || null,
      statut: form.statut,
      priorite: form.priorite,
      avancement: 0,
      date_debut: form.date_debut || null,
      date_fin_prevue: form.date_fin_prevue || null,
      budget_prevu: form.budget_prevu ? parseFloat(form.budget_prevu) : 0,
      heures_prevues: form.heures_prevues ? parseInt(form.heures_prevues) : 0,
      budget_reel: 0,
      client_id: isSpecial ? null : (form.client_id || null),
      contrat_id: form.contrat_id || null,
      chef_projet_id: form.chef_projet_id || userData.id,
      created_by: userData.id,
      stack_technique: stack.length > 0 ? stack : null,
      depot_git: form.depot_git.trim() || null,
      lien_design: form.lien_design.trim() || null,
      type_projet: form.type_projet,
      parent_id: form.parent_id || null,
    }).select('id').single()

    if (insertError) { setError(insertError.message); setSaving(false); return }

    if (data?.id) {
      // Pour les projets spéciaux : insérer dans la table de liaison
      if (isSpecial && clientIds.length > 0) {
        await supabase.from('projets_clients').insert(
          clientIds.map(cid => ({ projet_id: data.id, client_id: cid }))
        )
      }

      // Sous-projet : hérite de l'accès du projet parent (RLS), pas de duplication d'équipe
      if (!form.parent_id) {
        // Ajouter les membres via RPC SECURITY DEFINER (contourne RLS)
        const chefId = form.chef_projet_id || userData.id
        const { error: membresErr } = await supabase.rpc('add_membres_projet', {
          p_projet_id:  data.id,
          p_chef_id:    chefId,
          p_team_ids:   teamIds.length > 0 ? teamIds : [],
          p_ajoute_par: userData.id,
        })
        if (membresErr) {
          setError(`Projet créé mais erreur équipe : ${membresErr.message}`)
          setSaving(false)
          router.push(`/projets/${data.id}`)
          return
        }
      }

      if (files.length > 0) {
        const pj: { nom: string; url_stockage: string; taille: number; type: string }[] = []
        for (const file of files) {
          const safeName = file.name.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '')
          const path = `projets/${data.id}/${Date.now()}_${safeName}`
          const { storedPath, error: ue } = await uploadToStorage(supabase, 'documents', path, file)
          if (!ue) pj.push({ nom: file.name, url_stockage: storedPath, taille: file.size, type: file.type })
        }
        if (pj.length > 0) {
          await supabase.from('projets').update({ pieces_jointes: pj } as any).eq('id', data.id)
        }
      }
    }

    setSaving(false)
    if (data) router.push(`/projets/${data.id}`)
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/projets" className="hover:text-blue flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Projets
        </Link>
        {projetParent && (
          <>
            <ChevronRight size={12} />
            <Link href={`/projets/${projetParent.id}`} className="hover:text-blue transition-colors">{projetParent.titre}</Link>
          </>
        )}
        <ChevronRight size={12} />
        <span className="text-text-primary">{projetParent ? 'Nouveau sous-projet' : 'Nouveau projet'}</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="page-title">{projetParent ? 'Nouveau sous-projet' : 'Nouveau projet'}</h1>
        <Button icon={<Save size={14} />} loading={saving} disabled={!form.titre.trim()} onClick={submit}>
          Créer le projet
        </Button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red/10 border border-red/20"><p className="text-xs text-red">{error}</p></div>}

      {/* Informations essentielles */}
      <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Informations du projet</h3>
        <div className="space-y-1.5">
          <label className="label">Titre *</label>
          <input className="input" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })}
            placeholder="Ex: Refonte site web SAMA Digital" autoFocus />
        </div>
        <div className="space-y-1.5">
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Objectifs, contexte, périmètre du projet..." />
        </div>
        <div className="space-y-1.5">
          <label className="label flex items-center gap-1.5"><FolderTree size={11} /> Projet parent</label>
          <select className="input" value={form.parent_id} onChange={e => selectParent(e.target.value)}>
            <option value="">Aucun (projet racine)</option>
            {projetsParents.map(p => <option key={p.id} value={p.id}>{p.titre}</option>)}
          </select>
          {projetParent && (
            <p className="text-2xs text-violet/80 flex items-center gap-1.5">
              <FolderTree size={10} />
              Sous-projet de « {projetParent.titre} » — phase/lot léger : client, contrat et équipe sont hérités du projet parent.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Statut initial</label>
            <select className="input" value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
              <option value="planifie">Planifié</option>
              <option value="en_cours">En cours</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label">Priorité</label>
            <select className="input" value={form.priorite} onChange={e => setForm({ ...form, priorite: e.target.value })}>
              <option value="basse">Basse</option>
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dates, Budget & Temps */}
      <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Dates, Budget & Temps</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Date de début</label>
            <input type="date" className="input" value={form.date_debut}
              onChange={e => setForm({ ...form, date_debut: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="label">Date de fin prévue</label>
            <input type="date" className="input" value={form.date_fin_prevue}
              onChange={e => setForm({ ...form, date_fin_prevue: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Budget prévu (FCFA)</label>
            <input type="number" className="input" value={form.budget_prevu} min="0"
              onChange={e => setForm({ ...form, budget_prevu: e.target.value })} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <label className="label flex items-center gap-1.5"><Clock size={11} /> Heures estimées</label>
            <input type="number" className="input" value={form.heures_prevues} min="0"
              onChange={e => setForm({ ...form, heures_prevues: e.target.value })} placeholder="Ex: 120" />
          </div>
        </div>
      </div>

      {/* Type de projet */}
      <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Layers size={14} className="text-violet" /> Type de projet
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'classique', label: 'Classique', desc: 'Associé à un seul client', icon: <Building2 size={16} /> },
            { value: 'special',   label: 'Spécial',   desc: 'Multi-clients / transversal', icon: <Layers size={16} /> },
          ] as const).map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setForm(f => ({ ...f, type_projet: opt.value }))}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                form.type_projet === opt.value
                  ? 'border-violet bg-violet/10 text-violet'
                  : 'border-surface-border text-text-muted hover:border-violet/30 hover:text-text-secondary'
              }`}>
              <span className="mt-0.5 flex-shrink-0">{opt.icon}</span>
              <div>
                <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
              </div>
              {form.type_projet === opt.value && <Check size={14} className="ml-auto flex-shrink-0 mt-0.5" />}
            </button>
          ))}
        </div>
        {form.type_projet === 'special' && (
          <div className="p-3 bg-violet/5 border border-violet/15 rounded-lg">
            <p className="text-xs text-violet/80">
              Un projet spécial peut être lié à plusieurs clients simultanément (ex : campagne marketing commune, audit multi-entités).
            </p>
          </div>
        )}
      </div>

      {/* Équipe & Client */}
      <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Users size={14} className="text-blue" /> Équipe & Client{form.type_projet === 'special' ? 's' : ''}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="label">Chef de projet</label>
            <select className="input" value={form.chef_projet_id}
              onChange={e => setForm({ ...form, chef_projet_id: e.target.value })}>
              <option value="">Moi-même</option>
              {membres.map(m => <option key={m.id} value={m.id}>{[m.prenom, m.nom].filter(Boolean).join(' ')}</option>)}
            </select>
          </div>
          {form.type_projet === 'classique' ? (
            <div className="space-y-1.5">
              <label className="label">Client</label>
              <select className="input" value={form.client_id}
                onChange={e => setForm({ ...form, client_id: e.target.value })}>
                <option value="">Aucun (interne)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom_entreprise}</option>)}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5 col-span-1">
              <label className="label">Clients associés</label>
              <p className="text-2xs text-text-muted">Sélectionne un ou plusieurs clients ci-dessous</p>
            </div>
          )}
        </div>

        {/* Multi-select clients pour projet spécial */}
        {form.type_projet === 'special' && (
          <div className="space-y-2">
            {clients.length === 0 ? (
              <p className="text-xs text-text-muted">Aucun client disponible</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {clients.map(c => {
                  const sel = clientIds.includes(c.id)
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setClientIds(prev => sel ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
                        sel ? 'bg-blue/10 border-blue/30' : 'border-surface-border hover:border-blue/20 hover:bg-surface-hover'
                      }`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        sel ? 'bg-blue text-white' : 'bg-surface-hover text-text-muted'
                      }`}>
                        {sel ? <Check size={12} /> : c.nom_entreprise[0]}
                      </div>
                      <span className="text-xs font-medium text-text-primary truncate flex-1">{c.nom_entreprise}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {clientIds.length > 0 && (
              <p className="text-xs text-text-muted">{clientIds.length} client{clientIds.length > 1 ? 's' : ''} sélectionné{clientIds.length > 1 ? 's' : ''}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="label flex items-center gap-1.5"><FileSignature size={11} /> Contrat CRM associé</label>
          <select className="input" value={form.contrat_id}
            onChange={e => setForm({ ...form, contrat_id: e.target.value })}>
            <option value="">Aucun contrat</option>
            {contrats.map(c => <option key={c.id} value={c.id}>{c.numero} — {c.titre}</option>)}
          </select>
        </div>
      </div>

      {/* Configuration Technique */}
      <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-6">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Code2 size={14} className="text-violet" /> Configuration Technique
        </h3>

        {/* Stack */}
        <div className="space-y-3">
          <label className="label">Stack Technique</label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_STACKS.map(tech => {
              const sel = stack.includes(tech)
              return (
                <button key={tech} type="button" onClick={() => toggleStack(tech)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                    ${sel ? 'bg-violet/10 text-violet border-violet/30' : 'border-surface-border text-text-muted hover:border-violet/30 hover:text-violet'}`}>
                  {sel && <Check size={10} />}{tech}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1 text-xs" value={stackInput}
              onChange={e => setStackInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTech() } }}
              placeholder="Autre technologie..." />
            <Button variant="secondary" size="sm" type="button" onClick={addCustomTech} disabled={!stackInput.trim()}>Ajouter</Button>
          </div>
          {stack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {stack.map(t => (
                <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet/10 text-violet border border-violet/20 rounded-full text-xs font-medium">
                  {t}<button type="button" onClick={() => toggleStack(t)} className="hover:text-red transition-colors"><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Git & Design */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <label className="label flex items-center gap-1.5"><GitBranch size={11} /> Dépôt Git (Repository)</label>
            <input type="url" className="input" value={form.depot_git}
              onChange={e => setForm({ ...form, depot_git: e.target.value })}
              placeholder="https://github.com/org/repo" />
          </div>
          <div className="space-y-1.5">
            <label className="label flex items-center gap-1.5"><Pen size={11} /> Lien Design (Figma)</label>
            <input type="url" className="input" value={form.lien_design}
              onChange={e => setForm({ ...form, lien_design: e.target.value })}
              placeholder="https://figma.com/file/..." />
          </div>
        </div>

        {/* Équipe assignée */}
        {form.parent_id ? (
          <div className="p-3 bg-violet/5 border border-violet/15 rounded-lg flex items-start gap-2.5">
            <FolderTree size={14} className="text-violet flex-shrink-0 mt-0.5" />
            <p className="text-xs text-violet/80">
              L'équipe n'a pas besoin d'être réassignée : ce sous-projet hérite automatiquement de l'accès accordé sur « {projetParent?.titre} ».
            </p>
          </div>
        ) : (
        <div className="space-y-3">
          <label className="label flex items-center gap-1.5"><Users size={11} /> Équipe assignée</label>
          {membres.length === 0 ? (
            <p className="text-xs text-text-muted">Aucun membre disponible</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {membres.map(m => {
                const sel = teamIds.includes(m.id)
                const initials = ((m.prenom?.[0] ?? '') + (m.nom?.[0] ?? '')).toUpperCase() || '?'
                const fullName = [m.prenom, m.nom].filter(Boolean).join(' ')
                return (
                  <button key={m.id} type="button" onClick={() => toggleTeam(m.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all overflow-hidden w-full
                      ${sel ? 'bg-blue/10 border-blue/30' : 'border-surface-border hover:border-blue/20 hover:bg-surface-hover'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${sel ? 'bg-blue text-white' : 'bg-surface-hover text-text-muted'}`}>
                      {sel ? <Check size={12} /> : initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text-primary truncate">{fullName || '—'}</p>
                      <p className="text-2xs text-text-muted capitalize truncate">{m.role.replace(/_/g, ' ')}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {teamIds.length > 0 && (
            <p className="text-xs text-text-muted">{teamIds.length} membre{teamIds.length > 1 ? 's' : ''} sélectionné{teamIds.length > 1 ? 's' : ''}</p>
          )}
        </div>
        )}
      </div>

      {/* Pièces jointes */}
      <div className="bg-surface border border-surface-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Paperclip size={14} className="text-blue" /> Pièces jointes
        </h3>
        <label className="relative flex items-center gap-3 px-4 py-3 border border-dashed border-surface-border rounded-lg cursor-pointer hover:border-blue/40 hover:bg-blue/5 transition-all select-none overflow-hidden">
          <Paperclip size={14} className="text-text-muted flex-shrink-0 relative z-10" />
          <div className="relative z-10">
            <p className="text-xs font-medium text-text-secondary">Cliquer pour ajouter des fichiers</p>
            <p className="text-2xs text-text-muted mt-0.5">PDF, Word, Excel, images, etc.</p>
          </div>
          <input type="file" multiple onChange={handleFiles}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.ppt,.pptx"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        </label>
        {files.length > 0 ? (
          <ul className="space-y-1.5">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 bg-surface-hover rounded-lg border border-surface-border">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={13} className="text-blue flex-shrink-0" />
                  <span className="text-xs text-text-primary truncate">{f.name}</span>
                  <span className="text-2xs text-text-muted flex-shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
                </div>
                <button type="button" onClick={() => removeFile(i)} className="text-text-muted hover:text-red transition-colors ml-3 flex-shrink-0">
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-text-muted text-center py-1">Aucun fichier sélectionné</p>
        )}
      </div>
    </div>
  )
}