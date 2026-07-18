// ─────────────────────────────────────────────────────────────
// PRÉSENTATIONNEL — Aurantir Front Kit.
// TODO(intégration): brancher données réelles. Ce fichier conserve sa logique
// dorigine mais sappuie sur le STUB Supabase (lib/supabase/client) : aucun
// appel réseau, il rend ses états « vide »/« chargement ». Remplacez
// createClient()/fetch par vos données (props typées ou votre API).
// ─────────────────────────────────────────────────────────────
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/aurantir-front-kit/lib/supabase/client'
import { useAppStore } from '@/aurantir-front-kit/lib/store/app.store'
import { Card } from '@/aurantir-front-kit/components/ui/Card'
import { Button } from '@/aurantir-front-kit/components/ui/Button'
import { Badge } from '@/aurantir-front-kit/components/ui/Badge'
import { ClientFormModal, type ClientRow } from './ClientFormModal'
import {
  Plus, Search, Building2, Globe, Phone,
  Mail, MapPin, User, ChevronRight, Pencil,
} from 'lucide-react'

const DOMAINE_LABELS: Record<string, string> = {
  administration: 'Administration', finance: 'Finance', education: 'Éducation',
  agriculture: 'Agriculture', commerce: 'Commerce', sante: 'Santé', tech: 'Tech', autre: 'Autre',
}

export default function ClientsPage() {
  const { user, entites, entiteActive } = useAppStore()
  const [clients, setClients]           = useState<ClientRow[]>([])
  const [loading, setLoading]           = useState(true)
  const [loadError, setLoadError]       = useState('')
  const [search, setSearch]             = useState('')
  const [entiteFiltre, setEntiteFiltre] = useState<string | null>(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [editClient, setEditClient]     = useState<ClientRow | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (entiteActive?.id && entiteFiltre === null) setEntiteFiltre(entiteActive.id)
  }, [entiteActive?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadClients() }, [entiteFiltre]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadClients() {
    setLoading(true); setLoadError('')
    let q = supabase.from('entreprises_clientes').select('*').order('created_at', { ascending: false })
    if (entiteFiltre) q = q.eq('entite_id', entiteFiltre)
    const { data, error } = await q
    if (error) setLoadError(error.message)
    setClients((data || []) as ClientRow[])
    setLoading(false)
  }

  const clientsFiltres = clients.filter(c =>
    !search || c.nom_entreprise.toLowerCase().includes(search.toLowerCase())
  )
  const entiteCourante = entiteFiltre ? entites.find(e => e.id === entiteFiltre) : null

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">
            {entiteCourante ? entiteCourante.nom : 'Vue globale'} — {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Nouveau client</Button>
      </div>

      {/* Filtres entité */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted font-medium mr-1">Entité :</span>
        <button onClick={() => setEntiteFiltre(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${entiteFiltre === null ? 'bg-blue/10 text-blue border-blue/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
          Vue globale
        </button>
        {entites.map(e => (
          <button key={e.id} onClick={() => setEntiteFiltre(e.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${entiteFiltre === e.id ? 'bg-violet/10 text-violet border-violet/30' : 'border-surface-border text-text-muted hover:border-surface-border-hover'}`}>
            {e.nom}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" placeholder="Rechercher un client..." value={search}
          onChange={e => setSearch(e.target.value)} className="input pl-8" />
      </div>

      {loadError && (
        <div className="p-3 rounded-lg bg-red/10 border border-red/20">
          <p className="text-xs text-red">Erreur : {loadError}</p>
        </div>
      )}

      {/* Grille */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-52 rounded-xl" />)
        ) : clientsFiltres.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <Building2 size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-muted">Aucun client trouvé</p>
            <Button size="sm" icon={<Plus size={14} />} className="mt-4" onClick={() => setShowCreate(true)}>
              Ajouter un client
            </Button>
          </div>
        ) : (
          clientsFiltres.map(client => {
            const isParticulier = (client as any).type_client === 'particulier'
            return (
              <div key={client.id} className="relative group">
                <Link href={`/crm/clients/${client.id}`} className="block">
                  <Card hover className="p-5 space-y-4 h-full">
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isParticulier ? 'bg-violet/10' : 'bg-blue/10'}`}>
                        {isParticulier
                          ? <User size={18} className="text-violet" />
                          : <Building2 size={18} className="text-blue" />
                        }
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="gray" size="sm">
                          {DOMAINE_LABELS[(client as any).domaine_activite] || 'Autre'}
                        </Badge>
                        {isParticulier && <Badge variant="violet" size="sm">Particulier</Badge>}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-text-primary group-hover:text-blue transition-colors pr-6">
                        {client.nom_entreprise}
                      </h3>
                      {client.secteur && <p className="text-xs text-text-muted mt-0.5">{client.secteur}</p>}
                    </div>

                    <div className="space-y-1.5">
                      {(client as any).email_principal && (
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <Mail size={11} className="flex-shrink-0" />
                          <span className="truncate">{(client as any).email_principal}</span>
                        </div>
                      )}
                      {client.telephone && (
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <Phone size={11} className="flex-shrink-0" />
                          <span>{client.telephone}</span>
                        </div>
                      )}
                      {!isParticulier && client.site_web && (
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <Globe size={11} className="flex-shrink-0" />
                          <span className="truncate">{client.site_web}</span>
                        </div>
                      )}
                      {(client as any).adresse && (
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <MapPin size={11} className="flex-shrink-0" />
                          <span className="truncate">{(client as any).adresse}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-surface-border">
                      <span className="text-2xs text-text-muted">{client.pays || '—'}</span>
                      <ChevronRight size={12} className="text-text-muted group-hover:text-blue transition-colors" />
                    </div>
                  </Card>
                </Link>

                {/* Bouton modifier (visible au hover) */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditClient(client) }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-surface border border-surface-border text-text-muted hover:text-blue hover:border-blue/30 hover:bg-blue/5 transition-all opacity-0 group-hover:opacity-100 z-10"
                  title="Modifier le client"
                >
                  <Pencil size={11} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Modal création */}
      {showCreate && (
        <ClientFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); loadClients() }}
          userId={user?.id}
          defaultEntiteId={entiteFiltre || ''}
          entites={entites}
        />
      )}

      {/* Modal édition */}
      {editClient && (
        <ClientFormModal
          mode="edit"
          clientData={editClient}
          onClose={() => setEditClient(null)}
          onSuccess={() => { setEditClient(null); loadClients() }}
          userId={user?.id}
          defaultEntiteId={entiteFiltre || editClient.entite_id || ''}
          entites={entites}
        />
      )}
    </div>
  )
}