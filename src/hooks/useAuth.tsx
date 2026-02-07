'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import {
  isPinSet,
  savePin,
  verifyPin,
  clearPin,
  updateLastActivity,
  isSessionExpired,
  incrementFailedAttempts,
  resetFailedAttempts,
  isLockedOut,
  getLockoutRemainingSeconds,
  getFailedAttempts,
} from '@/lib/pin-auth'

type AuthState = 'loading' | 'need_login' | 'need_pin_setup' | 'need_pin' | 'authenticated'

interface AuthContextType {
  user: User | null
  session: Session | null
  authState: AuthState
  failedAttempts: number
  lockoutSeconds: number
  autoLoginError: string | null
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  setupPin: (pin: string) => Promise<void>
  checkPin: (pin: string) => Promise<boolean>
  changePin: (currentPin: string, newPin: string) => Promise<boolean>
  resetPinWithPassword: () => void
  retryAutoLogin: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const [pinVerified, setPinVerified] = useState(false)
  const [autoLoginError, setAutoLoginError] = useState<string | null>(null)
  const autoLoginAttempted = useRef(false)

  // 환경변수로 자동 로그인
  const autoLogin = async (): Promise<boolean> => {
    const autoEmail = process.env.NEXT_PUBLIC_AUTO_EMAIL
    const autoPassword = process.env.NEXT_PUBLIC_AUTO_PASSWORD
    if (!autoEmail || !autoPassword) return false
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: autoEmail,
      password: autoPassword,
    })
    return !error
  }

  // need_login 상태일 때 자동 로그인 시도
  useEffect(() => {
    if (authState === 'need_login' && !autoLoginAttempted.current) {
      autoLoginAttempted.current = true
      setAutoLoginError(null)
      autoLogin().then((success) => {
        if (!success) {
          setAutoLoginError('자동 로그인에 실패했습니다.')
        }
        // 성공 시 onAuthStateChange가 상태를 업데이트함
      })
    }
  }, [authState])

  // 잠금 카운트다운
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        const remaining = getLockoutRemainingSeconds()
        setLockoutSeconds(remaining)
        if (remaining === 0) {
          setFailedAttempts(0)
        }
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [lockoutSeconds])

  // 앱 이탈/복귀 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 복귀 시: 세션 만료 확인
        if (pinVerified && isSessionExpired()) {
          setPinVerified(false)
          setAuthState('need_pin')
        }
      } else {
        // 이탈 시: 마지막 활동 시간 저장
        updateLastActivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pinVerified])

  // 활동 시 시간 업데이트
  useEffect(() => {
    if (authState === 'authenticated') {
      const handleActivity = () => updateLastActivity()
      window.addEventListener('click', handleActivity)
      window.addEventListener('keydown', handleActivity)
      window.addEventListener('touchstart', handleActivity)
      return () => {
        window.removeEventListener('click', handleActivity)
        window.removeEventListener('keydown', handleActivity)
        window.removeEventListener('touchstart', handleActivity)
      }
    }
  }, [authState])

  // 초기 인증 상태 확인
  useEffect(() => {
    const supabase = createClient()

    const initAuth = async () => {
      const { data: { session: sess } } = await supabase.auth.getSession()
      setSession(sess)
      setUser(sess?.user ?? null)
      determineAuthState(sess?.user ?? null)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, sess: Session | null) => {
        setSession(sess)
        setUser(sess?.user ?? null)
        determineAuthState(sess?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const determineAuthState = useCallback((user: User | null) => {
    if (!user) {
      // 로그인 안 됨
      if (isPinSet()) {
        // PIN이 설정되어 있으면 PIN 입력 화면
        setAuthState('need_pin')
        setFailedAttempts(getFailedAttempts())
        if (isLockedOut()) {
          setLockoutSeconds(getLockoutRemainingSeconds())
        }
      } else {
        // PIN도 없으면 로그인 화면
        setAuthState('need_login')
      }
    } else {
      // Supabase 로그인 됨
      if (!isPinSet()) {
        // PIN 설정 필요
        setAuthState('need_pin_setup')
      } else if (pinVerified || !isSessionExpired()) {
        // PIN 검증됨 또는 세션 유효
        setPinVerified(true)
        updateLastActivity()
        setAuthState('authenticated')
      } else {
        // PIN 재입력 필요
        setAuthState('need_pin')
        setFailedAttempts(getFailedAttempts())
        if (isLockedOut()) {
          setLockoutSeconds(getLockoutRemainingSeconds())
        }
      }
    }
  }, [pinVerified])

  const signIn = async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setPinVerified(false)
    autoLoginAttempted.current = false
  }

  const setupPin = async (pin: string) => {
    await savePin(pin)
    setPinVerified(true)
    updateLastActivity()
    setAuthState('authenticated')
  }

  const checkPin = async (pin: string): Promise<boolean> => {
    if (isLockedOut()) {
      setLockoutSeconds(getLockoutRemainingSeconds())
      return false
    }

    const valid = await verifyPin(pin)

    if (valid) {
      resetFailedAttempts()
      setFailedAttempts(0)
      setPinVerified(true)
      updateLastActivity()

      // Supabase 세션 확인
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setAuthState('authenticated')
      } else {
        // 세션 만료, 자동 재로그인 시도
        const success = await autoLogin()
        if (success) {
          setAuthState('authenticated')
        } else {
          setAuthState('need_login')
        }
      }
      return true
    } else {
      const attempts = incrementFailedAttempts()
      setFailedAttempts(attempts)
      if (isLockedOut()) {
        setLockoutSeconds(getLockoutRemainingSeconds())
      }
      return false
    }
  }

  const changePin = async (currentPin: string, newPin: string): Promise<boolean> => {
    const valid = await verifyPin(currentPin)
    if (!valid) return false

    await savePin(newPin)
    return true
  }

  const resetPinWithPassword = () => {
    clearPin()
    autoLoginAttempted.current = false
    if (user) {
      // 세션이 있으면 바로 PIN 재설정
      setAuthState('need_pin_setup')
    } else {
      // 세션 없으면 자동 로그인 후 PIN 설정으로
      setAuthState('need_login')
    }
  }

  const retryAutoLogin = () => {
    autoLoginAttempted.current = false
    setAutoLoginError(null)
    setAuthState('need_login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authState,
        failedAttempts,
        lockoutSeconds,
        autoLoginError,
        signIn,
        signUp,
        signOut,
        setupPin,
        checkPin,
        changePin,
        resetPinWithPassword,
        retryAutoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
