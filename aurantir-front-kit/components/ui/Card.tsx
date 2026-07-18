import React from 'react'
import Link from 'next/link'
import { cn } from '@/aurantir-front-kit/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: 'blue' | 'green' | 'violet' | false
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

export function Card({ children, className, hover, glow, padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }

  return (
    <div className={cn(
      'bg-surface border border-surface-border rounded-xl',
      'transition-all duration-200',
      paddings[padding],
      hover && 'hover:-translate-y-px hover:border-blue/20 hover:shadow-card-hover cursor-pointer',
      glow === 'blue' && 'shadow-glow-blue',
      glow === 'green' && 'shadow-glow-green',
      glow === 'violet' && 'shadow-glow-violet',
      className
    )}
    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  variation?: number
  variationLabel?: string
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'violet' | 'amber' | 'red'
  loading?: boolean
  href?: string
}

export function StatCard({ label, value, variation, variationLabel, icon, color = 'blue', loading, href }: StatCardProps) {
  const colorMap = {
    blue: 'text-blue bg-blue/10',
    green: 'text-green bg-green/10',
    violet: 'text-violet bg-violet/10',
    amber: 'text-amber bg-amber/10',
    red: 'text-red bg-red/10',
  }

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <p className="text-sm text-text-muted">{label}</p>
        {icon && (
          <div className={cn('p-2 rounded-lg', colorMap[color])}>
            {icon}
          </div>
        )}
      </div>

      {loading ? (
        <div className="skeleton h-8 w-32 rounded" />
      ) : (
        <p className="text-2xl font-bold text-text-primary leading-none tracking-tight">{value}</p>
      )}

      {variation !== undefined && (
        <div className="flex items-center gap-1">
          <span className={cn(
            'text-xs font-medium',
            variation > 0 ? 'text-green' : variation < 0 ? 'text-red' : 'text-text-muted'
          )}>
            {variation > 0 ? '↑' : variation < 0 ? '↓' : '→'}
            {' '}{Math.abs(variation)}%
          </span>
          {variationLabel && (
            <span className="text-xs text-text-muted">{variationLabel}</span>
          )}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className={cn('space-y-4 hover:-translate-y-px hover:border-blue/20 cursor-pointer group')}>
          {inner}
        </Card>
      </Link>
    )
  }

  return <Card className="space-y-4">{inner}</Card>
}
