import { StockPrice, ExchangeRate } from '@/types/database'

const CACHE_KEY_PRICES = 'stock_prices_cache'
const CACHE_KEY_EXCHANGE = 'exchange_rate_cache'
const EXCHANGE_RATE_CACHE_DURATION = 60 * 60 * 1000 // 1시간 (밀리초)

// 캐시에서 가격 정보 가져오기
export function getCachedPrices(): Record<string, StockPrice> {
  if (typeof window === 'undefined') return {}
  const cached = localStorage.getItem(CACHE_KEY_PRICES)
  if (!cached) return {}
  try {
    return JSON.parse(cached)
  } catch {
    return {}
  }
}

// 캐시에 가격 정보 저장
export function setCachedPrices(prices: Record<string, StockPrice>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CACHE_KEY_PRICES, JSON.stringify(prices))
}

// 캐시에서 환율 정보 가져오기
export function getCachedExchangeRate(): ExchangeRate | null {
  if (typeof window === 'undefined') return null
  const cached = localStorage.getItem(CACHE_KEY_EXCHANGE)
  if (!cached) return null
  try {
    return JSON.parse(cached)
  } catch {
    return null
  }
}

// 환율 캐시가 만료되었는지 확인 (1시간)
export function isExchangeRateCacheExpired(): boolean {
  const cached = getCachedExchangeRate()
  if (!cached || !cached.lastUpdated) return true

  const lastUpdated = new Date(cached.lastUpdated).getTime()
  const now = Date.now()
  return now - lastUpdated > EXCHANGE_RATE_CACHE_DURATION
}

// 캐시에 환율 정보 저장
export function setCachedExchangeRate(rate: ExchangeRate) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CACHE_KEY_EXCHANGE, JSON.stringify(rate))
}

// Yahoo Finance 비공식 API로 주가 조회
export async function fetchStockPrice(ticker: string): Promise<StockPrice | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch stock price')
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]

    if (!result) {
      return null
    }

    const meta = result.meta
    const price = meta.regularMarketPrice
    const previousClose = meta.previousClose || meta.chartPreviousClose
    const change = price - previousClose
    const changePercent = (change / previousClose) * 100

    return {
      ticker: ticker.toUpperCase(),
      price,
      previousClose,
      change,
      changePercent,
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Failed to fetch price for ${ticker}:`, error)
    return null
  }
}

// 여러 종목 주가 조회
export async function fetchMultipleStockPrices(tickers: string[]): Promise<Record<string, StockPrice>> {
  const results: Record<string, StockPrice> = {}

  // 병렬로 조회
  const promises = tickers.map(async (ticker) => {
    const price = await fetchStockPrice(ticker)
    if (price) {
      results[ticker.toUpperCase()] = price
    }
  })

  await Promise.all(promises)

  // 캐시 업데이트
  const cached = getCachedPrices()
  const updated = { ...cached, ...results }
  setCachedPrices(updated)

  return results
}

// 환율 조회 결과 타입
export interface ExchangeRateResult {
  data: ExchangeRate | null
  error: boolean
  fromCache: boolean
}

// 환율 조회 (USD/KRW) - 서버사이드 API 라우트 사용
export async function fetchExchangeRate(forceRefresh = false): Promise<ExchangeRateResult> {
  // 캐시가 유효하고 강제 새로고침이 아니면 캐시 사용
  if (!forceRefresh && !isExchangeRateCacheExpired()) {
    const cached = getCachedExchangeRate()
    if (cached) {
      return { data: cached, error: false, fromCache: true }
    }
  }

  try {
    const response = await fetch('/api/exchange-rate')

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate')
    }

    const data = await response.json()

    const exchangeRate: ExchangeRate = {
      rate: data.rate,
      source: data.source,
      lastUpdated: data.lastUpdated,
    }

    // 캐시 업데이트
    setCachedExchangeRate(exchangeRate)

    return { data: exchangeRate, error: false, fromCache: false }
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error)
    // 실패 시 캐시된 값 반환
    const cached = getCachedExchangeRate()
    return { data: cached, error: true, fromCache: true }
  }
}

// 수동 가격 설정
export function setManualPrice(ticker: string, price: number) {
  const cached = getCachedPrices()
  cached[ticker.toUpperCase()] = {
    ticker: ticker.toUpperCase(),
    price,
    lastUpdated: new Date().toISOString(),
  }
  setCachedPrices(cached)
}

// 수동 환율 설정
export function setManualExchangeRate(rate: number) {
  setCachedExchangeRate({
    rate,
    lastUpdated: new Date().toISOString(),
  })
}
