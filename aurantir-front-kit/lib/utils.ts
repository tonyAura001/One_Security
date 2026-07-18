import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('fr-SN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function formatMontant(montant: number, devise = 'FCFA'): string {
  if (devise === 'FCFA') {
    return formatNumber(montant) + ' FCFA'
  }
  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: devise,
  }).format(montant)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-SN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-SN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  const diff = (new Date(date).getTime() - Date.now()) / 1000

  if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second')
  if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (Math.abs(diff) < 2592000) return rtf.format(Math.round(diff / 86400), 'day')
  return formatDate(date)
}

// Version compacte pour les listes (sidebar messagerie, etc.)
export function formatShortTime(date: string | Date): string {
  const d = new Date(date)
  const diffSec = (Date.now() - d.getTime()) / 1000

  if (diffSec < 60) return '< 1 min'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h`
  if (diffSec < 172800) return 'hier'
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} j`
  return d.toLocaleDateString('fr', { day: 'numeric', month: 'short' })
}

export function joursRestants(date: string): number {
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
}

export function truncate(str: string, n = 50): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

export function initiales(prenom: string, nom?: string): string {
  return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase()
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(values, v => chars[v % chars.length]).join('')
}

export function pourcentage(valeur: number, total: number): number {
  if (total === 0) return 0
  return Math.round((valeur / total) * 100)
}

export function variationPct(actuel: number, precedent: number): number {
  if (precedent === 0) return actuel > 0 ? 100 : 0
  return Math.round(((actuel - precedent) / precedent) * 100)
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key])
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export const ENTITE_COLORS = {
  'Sama Digital': '#AEB8AE',
  'Aurantir': '#2D6BFF',
}

export const ENTITE_IDS = {
  SAMA: 'a0000000-0000-0000-0000-000000000001',
  AURANTIR: 'a0000000-0000-0000-0000-000000000002',
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const escape = (v: string | number | null | undefined): string => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
