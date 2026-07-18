'use client'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/aurantir-front-kit/components/ui/DropdownMenu'

const ICON_STROKE = 1.5

export interface ActionMenuItem {
  label:    string
  icon:     React.ReactNode
  onClick?: () => void
  danger?:  boolean
  separatorBefore?: boolean
}

export function ActionsMenu({ items }: { items: ActionMenuItem[] }) {
  if (items.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="Actions"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors data-[state=open]:bg-white/5 data-[state=open]:text-white"
        >
          <MoreHorizontal size={15} strokeWidth={ICON_STROKE} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {items.map((item, i) => (
          <div key={i}>
            {item.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem danger={item.danger} onSelect={item.onClick}>
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
