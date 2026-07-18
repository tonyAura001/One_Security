'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { formatMontant } from '@/aurantir-front-kit/lib/utils'

interface ChartDataPoint {
  name: string
  revenus: number
  depenses: number
  tresoEntrees: number
  tresoSorties: number
}

const SERIES = [
  { key: 'revenus',      label: 'Revenus factures',    color: '#10b981', gradId: 'gRev',  opacity: 0.20 },
  { key: 'tresoEntrees', label: 'Entrées trésorerie',  color: '#3B82F6', gradId: 'gTrE',  opacity: 0.20 },
  { key: 'tresoSorties', label: 'Sorties trésorerie',  color: '#F59E0B', gradId: 'gTrS',  opacity: 0.18 },
  { key: 'depenses',     label: 'Dépenses factures',   color: '#f43f5e', gradId: 'gDep',  opacity: 0.18 },
]

const tickFmt = (v: number) => {
  if (v === 0) return '0'
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + 'k'
  return String(v)
}

export function RevenusChart({ data }: { data: ChartDataPoint[] }) {
  const isEmpty = data.length === 0 || data.every(
    d => d.revenus === 0 && d.depenses === 0 && d.tresoEntrees === 0 && d.tresoSorties === 0
  )

  if (isEmpty) {
    return (
      <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-center">
        <div className="flex items-center gap-3 opacity-30">
          <div className="w-8 h-px bg-blue" />
          <div className="w-2 h-2 rounded-full bg-blue" />
          <div className="w-8 h-px bg-blue" />
        </div>
        <p className="text-xs text-slate-500 mt-1">Aucune donnée financière sur les 6 derniers mois</p>
        <p className="text-[11px] text-slate-600">Les données apparaîtront dès qu'une facture sera payée ou une opération enregistrée</p>
      </div>
    )
  }

  return (
    <div>
      {/* Légende */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
        {SERIES.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-text-muted">{s.label}</span>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            {SERIES.map(s => (
              <linearGradient key={s.gradId} id={s.gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={s.color} stopOpacity={s.opacity} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
          <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} />
          <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={tickFmt} width={45} />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px' }}
            labelStyle={{ color: '#E5E7EB' }}
            formatter={(v, name) => [formatMontant(v as number), String(name ?? '')]}
          />
          {SERIES.map(s => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              fill={`url(#${s.gradId})`}
              strokeWidth={2}
              name={s.label}
              dot={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

