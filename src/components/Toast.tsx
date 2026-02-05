'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
  hiding?: boolean
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId

    setToasts((prev) => [...prev, { id, message, type }])

    // 2초 후 사라지기 시작
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, hiding: true } : t))
      )
    }, 2000)

    // 2.3초 후 완전히 제거
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2300)
  }, [])

  const removeToast = (id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, hiding: true } : t))
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* 토스트 컨테이너 */}
      <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-lg space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg',
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-destructive text-destructive-foreground',
              toast.hiding ? 'animate-slide-down' : 'animate-slide-up'
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
