import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 숫자 포맷팅 함수들
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatKRW(value: number): string {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억원`
  }
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(0)}만원`
  }
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatExchangeRate(value: number): string {
  return `₩${new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`
}
