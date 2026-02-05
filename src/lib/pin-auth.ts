// PIN 인증 관련 유틸리티

const PIN_HASH_KEY = 'pin_hash'
const LAST_ACTIVITY_KEY = 'last_activity'
const FAILED_ATTEMPTS_KEY = 'failed_attempts'
const LOCKOUT_UNTIL_KEY = 'lockout_until'
const SESSION_TIMEOUT_MS = 10 * 60 * 1000 // 10분
const LOCKOUT_DURATION_MS = 30 * 1000 // 30초
const MAX_FAILED_ATTEMPTS = 5

// SHA-256 해시 생성
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// PIN 설정 여부 확인
export function isPinSet(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(PIN_HASH_KEY) !== null
}

// PIN 저장
export async function savePin(pin: string): Promise<void> {
  const hash = await hashPin(pin)
  localStorage.setItem(PIN_HASH_KEY, hash)
  resetFailedAttempts()
}

// PIN 검증
export async function verifyPin(pin: string): Promise<boolean> {
  const storedHash = localStorage.getItem(PIN_HASH_KEY)
  if (!storedHash) return false

  const inputHash = await hashPin(pin)
  return storedHash === inputHash
}

// PIN 삭제 (재설정용)
export function clearPin(): void {
  localStorage.removeItem(PIN_HASH_KEY)
  resetFailedAttempts()
}

// 마지막 활동 시간 업데이트
export function updateLastActivity(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString())
}

// 세션 타임아웃 확인 (10분 이상 이탈했는지)
export function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return true
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY)
  if (!lastActivity) return true

  const elapsed = Date.now() - parseInt(lastActivity, 10)
  return elapsed > SESSION_TIMEOUT_MS
}

// 실패 횟수 관리
export function getFailedAttempts(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10)
}

export function incrementFailedAttempts(): number {
  const attempts = getFailedAttempts() + 1
  localStorage.setItem(FAILED_ATTEMPTS_KEY, attempts.toString())

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS
    localStorage.setItem(LOCKOUT_UNTIL_KEY, lockoutUntil.toString())
  }

  return attempts
}

export function resetFailedAttempts(): void {
  localStorage.removeItem(FAILED_ATTEMPTS_KEY)
  localStorage.removeItem(LOCKOUT_UNTIL_KEY)
}

// 잠금 상태 확인
export function isLockedOut(): boolean {
  if (typeof window === 'undefined') return false
  const lockoutUntil = localStorage.getItem(LOCKOUT_UNTIL_KEY)
  if (!lockoutUntil) return false

  const until = parseInt(lockoutUntil, 10)
  if (Date.now() >= until) {
    resetFailedAttempts()
    return false
  }
  return true
}

export function getLockoutRemainingSeconds(): number {
  const lockoutUntil = localStorage.getItem(LOCKOUT_UNTIL_KEY)
  if (!lockoutUntil) return 0

  const remaining = parseInt(lockoutUntil, 10) - Date.now()
  return Math.max(0, Math.ceil(remaining / 1000))
}
