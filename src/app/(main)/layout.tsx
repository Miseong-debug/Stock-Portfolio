'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { BottomNav } from '@/components/BottomNav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { authState } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authState === 'need_login' || authState === 'need_pin' || authState === 'need_pin_setup') {
      router.push('/login')
    }
  }, [authState, router])

  if (authState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  if (authState !== 'authenticated') {
    return null
  }

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24 bg-background">
      <main className="p-4">{children}</main>
      <BottomNav />
    </div>
  )
}
