'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { PinPad } from '@/components/PinPad'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const {
    authState,
    failedAttempts,
    lockoutSeconds,
    autoLoginError,
    setupPin,
    checkPin,
    resetPinWithPassword,
    retryAutoLogin,
  } = useAuth()
  const router = useRouter()

  const [pinError, setPinError] = useState<string | null>(null)
  const [pinStep, setPinStep] = useState<'first' | 'confirm'>('first')
  const [firstPin, setFirstPin] = useState('')

  // 인증 완료 시 리다이렉트
  useEffect(() => {
    if (authState === 'authenticated') {
      router.push('/')
    }
  }, [authState, router])

  // PIN 설정 핸들러
  const handlePinSetup = useCallback(async (pin: string) => {
    if (pinStep === 'first') {
      setFirstPin(pin)
      setPinStep('confirm')
      setPinError(null)
    } else {
      if (pin === firstPin) {
        await setupPin(pin)
      } else {
        setPinError('PIN이 일치하지 않습니다. 다시 시도해주세요.')
        setPinStep('first')
        setFirstPin('')
      }
    }
  }, [pinStep, firstPin, setupPin])

  // PIN 확인 핸들러
  const handlePinCheck = useCallback(async (pin: string) => {
    const success = await checkPin(pin)
    if (!success) {
      setPinError('비밀번호가 틀렸습니다.')
    }
  }, [checkPin])

  // 로딩 또는 자동 로그인 중
  if (authState === 'loading' || (authState === 'need_login' && !autoLoginError)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">
          {authState === 'loading' ? '로딩 중...' : '자동 로그인 중...'}
        </p>
      </div>
    )
  }

  // 자동 로그인 실패
  if (authState === 'need_login' && autoLoginError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-sm text-destructive">{autoLoginError}</p>
        <Button onClick={retryAutoLogin}>다시 시도</Button>
      </div>
    )
  }

  // PIN 입력 화면
  if (authState === 'need_pin') {
    return (
      <div className="relative">
        <PinPad
          title="비밀번호 입력"
          subtitle="6자리 PIN을 입력하세요"
          onComplete={handlePinCheck}
          error={pinError}
          lockoutSeconds={lockoutSeconds}
        />
        {failedAttempts > 0 && failedAttempts < 5 && (
          <p className="absolute bottom-24 left-0 right-0 text-center text-sm text-muted-foreground">
            {5 - failedAttempts}회 남음
          </p>
        )}
        <button
          onClick={resetPinWithPassword}
          className="absolute bottom-8 left-0 right-0 text-center text-sm text-muted-foreground underline"
        >
          PIN을 잊으셨나요?
        </button>
      </div>
    )
  }

  // PIN 설정 화면
  if (authState === 'need_pin_setup') {
    return (
      <PinPad
        title={pinStep === 'first' ? 'PIN 설정' : 'PIN 확인'}
        subtitle={
          pinStep === 'first'
            ? '앱 잠금에 사용할 6자리 PIN을 입력하세요'
            : '다시 한번 입력해주세요'
        }
        onComplete={handlePinSetup}
        error={pinError}
      />
    )
  }

  return null
}
