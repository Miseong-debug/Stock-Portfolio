'use client'

import { useState, useEffect } from 'react'
import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PinPadProps {
  onComplete: (pin: string) => void
  title: string
  subtitle?: string
  error?: string | null
  disabled?: boolean
  lockoutSeconds?: number
}

export function PinPad({
  onComplete,
  title,
  subtitle,
  error,
  disabled,
  lockoutSeconds = 0,
}: PinPadProps) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)

  // 에러 시 흔들림 효과
  useEffect(() => {
    if (error) {
      setShake(true)
      setPin('')
      const timer = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(timer)
    }
  }, [error])

  // 6자리 입력 완료 시 자동 제출
  useEffect(() => {
    if (pin.length === 6) {
      onComplete(pin)
    }
  }, [pin, onComplete])

  const handleNumber = (num: string) => {
    if (disabled || pin.length >= 6) return
    setPin((prev) => prev + num)
  }

  const handleDelete = () => {
    if (disabled) return
    setPin((prev) => prev.slice(0, -1))
  }

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-8">
        {/* 제목 */}
        <div className="text-center">
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {/* PIN 표시 */}
        <div
          className={cn(
            'flex justify-center gap-3',
            shake && 'animate-shake'
          )}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                'h-4 w-4 rounded-full border-2 transition-all',
                i < pin.length
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/30 bg-transparent'
              )}
            />
          ))}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        {/* 잠금 카운트다운 */}
        {lockoutSeconds > 0 && (
          <p className="text-center text-sm text-destructive">
            {lockoutSeconds}초 후에 다시 시도해주세요
          </p>
        )}

        {/* 숫자 키패드 */}
        <div className="grid grid-cols-3 gap-4">
          {numbers.map((num, i) => {
            if (num === '') {
              return <div key={i} />
            }

            if (num === 'del') {
              return (
                <button
                  key={i}
                  onClick={handleDelete}
                  disabled={disabled || lockoutSeconds > 0}
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-full transition-all mx-auto',
                    'active:bg-muted',
                    (disabled || lockoutSeconds > 0) && 'opacity-50'
                  )}
                >
                  <Delete className="h-6 w-6" />
                </button>
              )
            }

            return (
              <button
                key={i}
                onClick={() => handleNumber(num)}
                disabled={disabled || lockoutSeconds > 0}
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-full text-2xl font-medium transition-all mx-auto',
                  'bg-muted hover:bg-muted/80 active:scale-95',
                  (disabled || lockoutSeconds > 0) && 'opacity-50'
                )}
              >
                {num}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
