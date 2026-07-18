// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Badge } from '@/aurantir-front-kit/components/ui/Badge'
import { formatRelativeTime } from '@/aurantir-front-kit/lib/utils'
import {
  FileText, Image, File, Archive, ChevronRight,
  Upload, Download, Search, Grid, List, ExternalLink,
  Share2, EyeOff, Loader2, Trash2, Users, Lock,
} from 'lucide-react'

interface Ressource {
  id: string
  nom: string
  type: string
  taille?: number
  url_stockage?: string
  description?: string
  tags?: string[]
  version_courante?: number
  visibilite: string
  created_at: string
  uploadeur?: { prenom: string; nom: string }
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf:   <FileText size={16} className="text-red" />,
  image: <Image    size={16} className="text-blue" />,
  video: <File     size={16} className="text-violet" />,
  doc:   <FileText size={16} className="text-blue" />,
  xls:   <FileText size={16} className="text-green" />,
  zip:   <Archive  size={16} className="text-amber" />,
  autre: <File     size={16} className="text-text-muted" />,
}

function formatTaille(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ProjetRessourcesPage() {
  const { id: projetId } = useParams<{ id: string }>()
  const { user } = useAppStore()
  const [ressources,  setRessources]  = useState<Ressource[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [view,        setView]        = useState<'grid' | 'list'>('grid')
  const [showUpload,  setShowUpload]  = useState(false)
  const [toggling,    setToggling]    = useState<string | null>(null)
  const [filter,      setFilter]      = useState<'all' | 'partage'>('all')
  const supabase = createClient()

  const isReadOnly   = user?.role === 'client_externe' || user?.role === 'invite_lecture'
  const canManage    = user?.role === 'fondateur' || user?.role === 'super_admin' || user?.role === 'manager'

  useEffect(() => { load() }, [projetId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('ressources')
      .select('id, nom, type, taille, url_stockage, description, tags, version_courante, visibilite, created_at, uploadeur:users!created_by(prenom, nom)')
      .eq('projet_id', projetId)
      .order('created_at', { ascending: false })
    setRessources((data || []) as unknown as Ressource[])
    setLoading(false)
  }

  async function togglePartage(r: Ressource) {
    setToggling(r.id)
    const newVisibilite = r.visibilite === 'collaborateur' ? 'interne' : 'collaborateur'
    await supabase.from('ressources').update({ visibilite: newVisibilite }).eq('id', r.id)
    setRessources(prev => prev.map(x => x.id === r.id ? { ...x, visibilite: newVisibilite } : x))
    setToggling(null)
  }

  async function deleteRessource(id: string) {
    if (!confirm('Supprimer cette ressource ?')) return
    await supabase.from('ressources').delete().eq('id', id)
    setRessources(prev => prev.filter(r => r.id !== id))
  }

  const filtered = ressources
    .filter(r => filter === 'all' || r.visibilite === 'collaborateur')
    .filter(r => !search || r.nom.toLowerCase().includes(search.toLowerCase()) || (r.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase())))

  const partageCount = ressources.filter(r => r.visibilite === 'collaborateur').length

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href={`/projets/${projetId}`} className="hover:text-blue transition-colors flex items-center gap-1">
          <ChevronRight size={12} className="rotate-180" /> Projet
        </Link>
        <ChevronRight size={12} />
        <span className="text-text-primary">Ressources</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Ressources</h1>
          <p className="page-subtitle">
            {ressources.length} fichier{ressources.length !== 1 ? 's' : ''}
            {partageCount > 0 && <span className="ml-2 text-blue">· {partageCount} partagé{partageCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        {!isReadOnly && (
          <Button size="sm" icon={<Upload size={14} />} onClick={() => setShowUpload(true)}>
            Uploader
          </Button>
        )}
      </div>

      {/* Bannière lecture seule */}
      {isReadOnly && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue/5 border border-blue/20">
          <Users size={13} className="text-blue flex-shrink-0" />
          <p className="text-xs text-blue">
            Vous avez accès aux documents partagés avec vous sur ce projet.
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex border border-surface-border rounded-lg overflow-hidden text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 transition-colors ${filter === 'all' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            Tous ({ressources.length})
          </button>
          <button
            onClick={() => setFilter('partage')}
            className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${filter === 'partage' ? 'bg-surface text-blue' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <Share2 size={11} /> Partagés ({partageCount})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 py-1.5 text-sm w-full"
          />
        </div>

        <div className="flex border border-surface-border rounded-lg overflow-hidden ml-auto">
          <button onClick={() => setView('grid')} className={`p-1.5 ${view === 'grid' ? 'bg-surface text-text-primary' : 'text-text-muted'}`}><Grid size={14} /></button>
          <button onClick={() => setView('list')} className={`p-1.5 ${view === 'list' ? 'bg-surface text-text-primary' : 'text-text-muted'}`}><List size={14} /></button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 gap-3' : 'space-y-2'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton rounded-xl ${view === 'grid' ? 'h-28' : 'h-12'}`} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <File size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? 'Aucun résultat' : filter === 'partage' ? 'Aucun document partagé' : 'Aucune ressource'}</p>
          {!isReadOnly && filter === 'partage' && ressources.length > 0 && (
            <p className="text-xs mt-1">Cliquez sur <Share2 size={10} className="inline" /> pour partager une ressource avec les membres du projet.</p>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(r => (
            <div key={r.id} className={`group relative p-3 rounded-xl border bg-surface hover:border-blue/30 transition-all ${
              r.visibilite === 'collaborateur' ? 'border-blue/30' : 'border-surface-border'
            }`}>
              {/* Badge partagé */}
              {r.visibilite === 'collaborateur' && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full bg-blue/15 flex items-center justify-center" title="Partagé avec les membres">
                    <Share2 size={9} className="text-blue" />
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-background-elevated flex items-center justify-center">
                  {FILE_ICONS[r.type] || FILE_ICONS.autre}
                </div>
              </div>

              <p className="text-xs font-medium text-text-primary truncate pr-4">{r.nom}</p>
              <p className="text-2xs text-text-muted">{formatTaille(r.taille)}</p>
              {r.version_courante && r.version_courante > 1 && (
                <span className="text-2xs text-blue">v{r.version_courante}</span>
              )}
              {(r.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {r.tags!.slice(0, 2).map(t => (
                    <span key={t} className="text-2xs bg-surface-hover px-1.5 py-0.5 rounded text-text-muted">{t}</span>
                  ))}
                </div>
              )}

              {/* Actions au hover */}
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-surface-border opacity-0 group-hover:opacity-100 transition-opacity">
                {r.url_stockage && (
                  <a href={r.url_stockage} target="_blank" rel="noreferrer"
                    className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-blue flex-1 flex items-center justify-center"
                    title="Télécharger">
                    <ExternalLink size={11} />
                  </a>
                )}
                {canManage && (
                  <>
                    <button
                      onClick={() => togglePartage(r)}
                      disabled={toggling === r.id}
                      className={`p-1 hover:bg-surface-hover rounded flex-1 flex items-center justify-center transition-colors ${
                        r.visibilite === 'collaborateur' ? 'text-blue hover:text-text-muted' : 'text-text-muted hover:text-blue'
                      }`}
                      title={r.visibilite === 'collaborateur' ? 'Ne plus partager' : 'Partager avec les membres'}
                    >
                      {toggling === r.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : r.visibilite === 'collaborateur'
                        ? <EyeOff size={11} />
                        : <Share2 size={11} />
                      }
                    </button>
                    <button
                      onClick={() => deleteRessource(r.id)}
                      className="p-1 hover:bg-red/10 rounded text-text-muted hover:text-red flex-1 flex items-center justify-center"
                      title="Supprimer">
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Taille</th>
                <th>Visibilité</th>
                <th>Ajouté par</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td className="flex items-center gap-2">
                    {FILE_ICONS[r.type] || FILE_ICONS.autre}
                    <span className="text-sm text-text-primary">{r.nom}</span>
                  </td>
                  <td><span className="text-2xs uppercase text-text-muted">{r.type}</span></td>
                  <td className="text-xs text-text-muted">{formatTaille(r.taille)}</td>
                  <td>
                    {r.visibilite === 'collaborateur'
                      ? <Badge variant="blue" size="sm"><Share2 size={9} className="mr-1" />Partagé</Badge>
                      : r.visibilite === 'public'
                      ? <Badge variant="green" size="sm">Public</Badge>
                      : <Badge variant="gray" size="sm"><Lock size={9} className="mr-1" />Interne</Badge>
                    }
                  </td>
                  <td className="text-xs text-text-muted">
                    {r.uploadeur ? `${r.uploadeur.prenom} ${r.uploadeur.nom}` : '—'}
                  </td>
                  <td className="text-2xs text-text-muted">{formatRelativeTime(r.created_at)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {r.url_stockage && (
                        <a href={r.url_stockage} target="_blank" rel="noreferrer"
                          className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-blue">
                          <Download size={12} />
                        </a>
                      )}
                      {canManage && (
                        <>
                          <button
                            onClick={() => togglePartage(r)}
                            disabled={toggling === r.id}
                            className={`p-1 hover:bg-surface-hover rounded transition-colors ${
                              r.visibilite === 'collaborateur' ? 'text-blue' : 'text-text-muted hover:text-blue'
                            }`}
                            title={r.visibilite === 'collaborateur' ? 'Ne plus partager' : 'Partager'}
                          >
                            {toggling === r.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : r.visibilite === 'collaborateur' ? <EyeOff size={12} /> : <Share2 size={12} />
                            }
                          </button>
                          <button
                            onClick={() => deleteRessource(r.id)}
                            className="p-1 hover:bg-red/10 rounded text-text-muted hover:text-red">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <UploadModal
          projetId={projetId}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); load() }}
        />
      )}
    </div>
  )
}

// ── Upload Modal ───────────────────────────────────────────────
function UploadModal({ projetId, onClose, onSuccess }: { projetId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    nom: '', type: 'doc', description: '', tags: '', url_stockage: '', visibilite: 'interne',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('id, entite_principale_id').eq('auth_user_id', user!.id).single()
    await supabase.from('ressources').insert({
      projet_id:       projetId,
      entite_id:       userData?.entite_principale_id || null,
      nom:             form.nom,
      type:            form.type,
      description:     form.description || null,
      tags:            form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      url_stockage:    form.url_stockage || null,
      visibilite:      form.visibilite,
      version_courante: 1,
      created_by:      userData!.id,
    })
    setSaving(false)
    onSuccess()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-text-primary">Ajouter une ressource</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="label">Nom *</label>
            <input type="text" className="input" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required placeholder="Nom du fichier" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="doc">Document</option>
                <option value="pdf">PDF</option>
                <option value="image">Image</option>
                <option value="xls">Tableur</option>
                <option value="zip">Archive</option>
                <option value="video">Vidéo</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Tags (virgule)</label>
              <input type="text" className="input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="design, v2, brief" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label">Visibilité</label>
            <select className="input" value={form.visibilite} onChange={e => setForm({ ...form, visibilite: e.target.value })}>
              <option value="interne">Interne (équipe uniquement)</option>
              <option value="collaborateur">Partagé (membres du projet)</option>
              <option value="public">Public</option>
            </select>
            {form.visibilite === 'collaborateur' && (
              <p className="text-2xs text-blue">Tous les membres assignés à ce projet pourront voir et télécharger cette ressource.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="label">URL / Lien</label>
            <input type="url" className="input" value={form.url_stockage} onChange={e => setForm({ ...form, url_stockage: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optionnel" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={saving}>Ajouter</Button>
          </div>
        </form>
      </div>
    </div>
  )
}