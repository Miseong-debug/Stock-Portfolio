'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, ArrowLeftRight, Coins, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/holdings', label: '보유종목', icon: Briefcase },
  { href: '/transactions', label: '거래내역', icon: ArrowLeftRight },
  { href: '/dividends', label: '배당금', icon: Coins },
  { href: '/settings', label: '설정', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
