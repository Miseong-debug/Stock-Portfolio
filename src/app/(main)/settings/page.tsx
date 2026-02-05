'use client'

import { useState } from 'react'
import { Sun, Moon, Monitor, KeyRound, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/components/Toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const APP_VERSION = '1.0.0'

export default function SettingsPage() {
  const { signOut, changePin } = useAuth()
  const { theme, setTheme } = useTheme()
  const { showToast } = useToast()

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  const handlePinChange = async () => {
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      showToast('PIN은 6자리 숫자여야 합니다.', 'error')
      return
    }

    if (newPin !== confirmPin) {
      showToast('새 PIN이 일치하지 않습니다.', 'error')
      return
    }

    setPinLoading(true)
    const success = await changePin(currentPin, newPin)
    setPinLoading(false)

    if (success) {
      showToast('PIN이 변경되었습니다.')
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
    } else {
      showToast('현재 PIN이 올바르지 않습니다.', 'error')
    }
  }

  const themeOptions = [
    { value: 'light', label: '라이트', icon: Sun },
    { value: 'dark', label: '다크', icon: Moon },
    { value: 'system', label: '시스템', icon: Monitor },
  ] as const

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">설정</h1>

      {/* 테마 설정 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">화면 테마</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon
              const isActive = theme === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  <span className={cn('text-sm', isActive && 'font-medium')}>
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* PIN 변경 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            PIN 변경
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>현재 PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="현재 PIN 6자리"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
              className="h-12 text-center text-lg tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label>새 PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="새 PIN 6자리"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              className="h-12 text-center text-lg tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label>새 PIN 확인</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="새 PIN 다시 입력"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className="h-12 text-center text-lg tracking-widest"
            />
          </div>
          <Button
            className="h-12 w-full text-base"
            onClick={handlePinChange}
            disabled={pinLoading || !currentPin || !newPin || !confirmPin}
          >
            {pinLoading ? '변경 중...' : 'PIN 변경'}
          </Button>
        </CardContent>
      </Card>

      {/* 로그아웃 */}
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            className="h-12 w-full text-base"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-5 w-5" />
            로그아웃
          </Button>
        </CardContent>
      </Card>

      {/* 앱 정보 */}
      <div className="pt-4 text-center text-sm text-muted-foreground">
        <p>주식 포트폴리오 v{APP_VERSION}</p>
      </div>
    </div>
  )
}
