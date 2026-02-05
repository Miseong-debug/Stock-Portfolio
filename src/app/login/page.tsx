'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PinPad } from '@/components/PinPad'

export default function LoginPage() {
  const {
    authState,
    failedAttempts,
    lockoutSeconds,
    signIn,
    signUp,
    setupPin,
    checkPin,
    resetPinWithPassword,
  } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinStep, setPinStep] = useState<'first' | 'confirm'>('first')
  const [firstPin, setFirstPin] = useState('')

  // 인증 완료 시 리다이렉트
  useEffect(() => {
    if (authState === 'authenticated') {
      router.push('/')
    }
  }, [authState, router])

  const handleLogin = async (type: 'login' | 'signup') => {
    setError(null)
    setLoading(true)

    try {
      const { error } = type === 'login'
        ? await signIn(email, password)
        : await signUp(email, password)

      if (error) {
        if (error.message.includes('Invalid login')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        } else if (error.message.includes('already registered')) {
          setError('이미 등록된 이메일입니다.')
        } else {
          setError(error.message)
        }
      }
    } catch {
      setError('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

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

  // 로딩 중
  if (authState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
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

  // 이메일/비밀번호 로그인 화면
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">주식 포트폴리오</CardTitle>
          <CardDescription>미국 주식 포트폴리오를 관리하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-login">이메일</Label>
                <Input
                  id="email-login"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-login">비밀번호</Label>
                <Input
                  id="password-login"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                onClick={() => handleLogin('login')}
                disabled={loading || !email || !password}
              >
                {loading ? '처리 중...' : '로그인'}
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-signup">이메일</Label>
                <Input
                  id="email-signup"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">비밀번호</Label>
                <Input
                  id="password-signup"
                  type="password"
                  placeholder="비밀번호를 입력하세요 (6자 이상)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                onClick={() => handleLogin('signup')}
                disabled={loading || !email || password.length < 6}
              >
                {loading ? '처리 중...' : '회원가입'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
