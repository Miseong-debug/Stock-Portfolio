'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { Holding, Transaction, Dividend, GroupedHolding, PortfolioSummary, StockPrice, ExchangeRate } from '@/types/database'
import {
  getCachedPrices,
  getCachedExchangeRate,
  fetchMultipleStockPrices,
  fetchExchangeRate,
  setManualPrice,
  setManualExchangeRate,
  setCachedPrices,
  setCachedExchangeRate,
} from '@/lib/stock-api'

export function usePortfolio() {
  const { user } = useAuth()
  const supabase = createClient()

  const [holdings, setHoldings] = useState<Holding[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [dividends, setDividends] = useState<Dividend[]>([])
  const [prices, setPrices] = useState<Record<string, StockPrice>>({})
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // 데이터 로드
  const loadData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const [holdingsRes, transactionsRes, dividendsRes] = await Promise.all([
        supabase.from('holdings').select('*').eq('user_id', user.id).order('ticker'),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('tx_date', { ascending: false }),
        supabase.from('dividends').select('*').eq('user_id', user.id).order('received_date', { ascending: false }),
      ])

      if (holdingsRes.data) setHoldings(holdingsRes.data)
      if (transactionsRes.data) setTransactions(transactionsRes.data)
      if (dividendsRes.data) setDividends(dividendsRes.data)

      // 캐시된 시세 정보 로드
      setPrices(getCachedPrices())
      setExchangeRate(getCachedExchangeRate())
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 시세 새로고침
  const refreshPrices = async () => {
    setRefreshing(true)
    try {
      const tickers = [...new Set(holdings.map((h) => h.ticker))]
      if (tickers.length > 0) {
        const newPrices = await fetchMultipleStockPrices(tickers)
        setPrices((prev) => ({ ...prev, ...newPrices }))
      }
      const newRate = await fetchExchangeRate()
      if (newRate) setExchangeRate(newRate)
    } catch (error) {
      console.error('Failed to refresh prices:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // 수동 시세 설정
  const updateManualPrice = (ticker: string, price: number) => {
    setManualPrice(ticker, price)
    setPrices(getCachedPrices())
  }

  const updateManualExchangeRate = (rate: number) => {
    setManualExchangeRate(rate)
    setExchangeRate(getCachedExchangeRate())
  }

  // 티커별 그룹핑
  const groupedHoldings: GroupedHolding[] = holdings.reduce((acc, holding) => {
    const existing = acc.find((g) => g.ticker === holding.ticker)
    if (existing) {
      existing.holdings.push(holding)
      existing.totalQuantity += Number(holding.quantity)
      // 가중평균 계산
      const totalCost = existing.holdings.reduce(
        (sum, h) => sum + Number(h.quantity) * Number(h.buy_price),
        0
      )
      const totalCostKRW = existing.holdings.reduce(
        (sum, h) => sum + Number(h.quantity) * Number(h.buy_price) * Number(h.buy_exchange_rate),
        0
      )
      existing.avgBuyPrice = totalCost / existing.totalQuantity
      existing.avgBuyExchangeRate = totalCostKRW / totalCost
    } else {
      acc.push({
        ticker: holding.ticker,
        company_name: holding.company_name,
        totalQuantity: Number(holding.quantity),
        avgBuyPrice: Number(holding.buy_price),
        avgBuyExchangeRate: Number(holding.buy_exchange_rate),
        holdings: [holding],
      })
    }
    return acc
  }, [] as GroupedHolding[])

  // 포트폴리오 요약 계산
  const summary: PortfolioSummary = (() => {
    const currentRate = exchangeRate?.rate || 1350 // 기본값

    let totalValueUSD = 0
    let totalInvestmentUSD = 0
    let totalInvestmentKRW = 0
    let stockProfit = 0 // 주가 수익 (원화)
    let exchangeProfit = 0 // 환차익 (원화)

    holdings.forEach((h) => {
      const qty = Number(h.quantity)
      const buyPrice = Number(h.buy_price)
      const buyRate = Number(h.buy_exchange_rate)
      const currentPrice = prices[h.ticker]?.price || buyPrice

      // 투자금
      const investmentUSD = qty * buyPrice
      const investmentKRW = investmentUSD * buyRate
      totalInvestmentUSD += investmentUSD
      totalInvestmentKRW += investmentKRW

      // 현재 평가액
      const valueUSD = qty * currentPrice
      totalValueUSD += valueUSD

      // 주가 수익 = 수량 × (현재가 - 매수가) × 매수환율
      stockProfit += qty * (currentPrice - buyPrice) * buyRate

      // 환차익 = 수량 × 현재가 × (현재환율 - 매수환율)
      exchangeProfit += qty * currentPrice * (currentRate - buyRate)
    })

    const totalValueKRW = totalValueUSD * currentRate
    const totalProfitUSD = totalValueUSD - totalInvestmentUSD
    const totalProfitKRW = totalValueKRW - totalInvestmentKRW
    const returnRateUSD = totalInvestmentUSD > 0 ? (totalProfitUSD / totalInvestmentUSD) * 100 : 0
    const returnRateKRW = totalInvestmentKRW > 0 ? (totalProfitKRW / totalInvestmentKRW) * 100 : 0

    // 총 배당금
    const totalDividends = dividends.reduce((sum, d) => sum + Number(d.amount), 0)

    return {
      totalValueUSD,
      totalValueKRW,
      totalInvestmentUSD,
      totalInvestmentKRW,
      totalProfitUSD,
      totalProfitKRW,
      stockProfit,
      exchangeProfit,
      returnRateUSD,
      returnRateKRW,
      totalDividends,
    }
  })()

  // CRUD 함수들
  const addHolding = async (data: Omit<Holding, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return
    const { error } = await supabase.from('holdings').insert({
      ...data,
      user_id: user.id,
    })
    if (!error) await loadData()
    return error
  }

  const updateHolding = async (id: string, data: Partial<Holding>) => {
    const { error } = await supabase.from('holdings').update(data).eq('id', id)
    if (!error) await loadData()
    return error
  }

  const deleteHolding = async (id: string) => {
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (!error) await loadData()
    return error
  }

  const addTransaction = async (data: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return
    const { error } = await supabase.from('transactions').insert({
      ...data,
      user_id: user.id,
    })
    if (!error) await loadData()
    return error
  }

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) await loadData()
    return error
  }

  const addDividend = async (data: Omit<Dividend, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return
    const { error } = await supabase.from('dividends').insert({
      ...data,
      user_id: user.id,
    })
    if (!error) await loadData()
    return error
  }

  const deleteDividend = async (id: string) => {
    const { error } = await supabase.from('dividends').delete().eq('id', id)
    if (!error) await loadData()
    return error
  }

  return {
    holdings,
    groupedHoldings,
    transactions,
    dividends,
    prices,
    exchangeRate,
    summary,
    loading,
    refreshing,
    refreshPrices,
    updateManualPrice,
    updateManualExchangeRate,
    addHolding,
    updateHolding,
    deleteHolding,
    addTransaction,
    deleteTransaction,
    addDividend,
    deleteDividend,
    reload: loadData,
  }
}
