'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page:        number   // page courante, base 1
  totalPages:  number
  onChange:    (page: number) => void
  className?:  string
}

export function Pagination({ page, totalPages, onChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = pageRange(page, totalPages)

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        aria-label="Page précédente"
      >
        <ChevronLeft size={14} />
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-xs text-text-muted">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-medium transition-colors ${
              p === page
                ? 'bg-blue text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        aria-label="Page suivante"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

// Construit la liste des numéros de page à afficher, avec "…" pour les sauts.
function pageRange(current: number, total: number): (number | '…')[] {
  const delta = 1
  const range: (number | '…')[] = []
  const start = Math.max(2, current - delta)
  const end   = Math.min(total - 1, current + delta)

  range.push(1)
  if (start > 2) range.push('…')
  for (let i = start; i <= end; i++) range.push(i)
  if (end < total - 1) range.push('…')
  if (total > 1) range.push(total)

  return range
}
