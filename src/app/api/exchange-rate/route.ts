import { NextResponse } from 'next/server'

interface ExchangeRateResponse {
  rate: number
  source: string
  lastUpdated: string
}

// 1순위: Frankfurter API (무료, 키 불필요)
async function fetchFromFrankfurter(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=KRW',
      { next: { revalidate: 3600 } } // 1시간 캐시
    )

    if (!response.ok) {
      throw new Error('Frankfurter API failed')
    }

    const data = await response.json()
    return data.rates?.KRW || null
  } catch (error) {
    console.error('Frankfurter API error:', error)
    return null
  }
}

// 2순위: Open Exchange Rates API (무료)
async function fetchFromOpenER(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { next: { revalidate: 3600 } }
    )

    if (!response.ok) {
      throw new Error('Open ER API failed')
    }

    const data = await response.json()
    return data.rates?.KRW || null
  } catch (error) {
    console.error('Open ER API error:', error)
    return null
  }
}

export async function GET() {
  let rate: number | null = null
  let source = ''

  // 1순위: Frankfurter
  rate = await fetchFromFrankfurter()
  if (rate) {
    source = 'frankfurter'
  }

  // 2순위: Open ER API
  if (!rate) {
    rate = await fetchFromOpenER()
    if (rate) {
      source = 'open.er-api'
    }
  }

  // 실패 시 에러 응답
  if (!rate) {
    return NextResponse.json(
      { error: '환율 조회에 실패했습니다.' },
      { status: 503 }
    )
  }

  const response: ExchangeRateResponse = {
    rate,
    source,
    lastUpdated: new Date().toISOString(),
  }

  return NextResponse.json(response)
}
