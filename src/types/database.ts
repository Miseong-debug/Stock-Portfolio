export interface Holding {
  id: string
  user_id: string
  ticker: string
  company_name: string
  quantity: number
  buy_price: number
  buy_exchange_rate: number
  buy_date: string
  memo: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  ticker: string
  company_name: string
  tx_type: 'buy' | 'sell'
  quantity: number
  price: number
  exchange_rate: number
  tx_date: string
  memo: string
  created_at: string
}

export interface Dividend {
  id: string
  user_id: string
  ticker: string
  company_name: string
  amount: number
  exchange_rate: number | null
  received_date: string
  memo: string
  created_at: string
}

// 티커별 그룹핑된 보유종목
export interface GroupedHolding {
  ticker: string
  company_name: string
  totalQuantity: number
  avgBuyPrice: number
  avgBuyExchangeRate: number
  holdings: Holding[]
}

// 시세 정보
export interface StockPrice {
  ticker: string
  price: number
  previousClose?: number
  change?: number
  changePercent?: number
  lastUpdated: string
}

export interface ExchangeRate {
  rate: number
  lastUpdated: string
}

// 포트폴리오 요약
export interface PortfolioSummary {
  totalValueUSD: number
  totalValueKRW: number
  totalInvestmentUSD: number
  totalInvestmentKRW: number
  totalProfitUSD: number
  totalProfitKRW: number
  stockProfit: number // 주가 수익 (원화)
  exchangeProfit: number // 환차익 (원화)
  returnRateUSD: number
  returnRateKRW: number
  totalDividends: number
}
