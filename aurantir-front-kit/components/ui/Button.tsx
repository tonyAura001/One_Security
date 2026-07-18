'use client'
import React from 'react'
import { cn } from '@/aurantir-front-kit/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, iconRight, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0D14] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'

    const variants = {
      primary: 'bg-blue text-white hover:bg-blue-hover rounded-lg shadow-sm hover:shadow-glow-blue',
      secondary: 'bg-surface border border-surface-border text-text-primary hover:bg-surface-hover hover:border-surface-border-hover rounded-lg',
      ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg',
      danger: 'bg-red/10 border border-red/20 text-red hover:bg-red/20 rounded-lg',
      success: 'bg-green/10 border border-green/20 text-green hover:bg-green/20 rounded-lg',
      outline: 'border border-blue/30 text-blue hover:bg-blue/10 rounded-lg',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-2.5 text-base',
      icon: 'p-2 aspect-square',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && !loading && (
          <span className="flex-shrink-0">{iconRight}</span>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
