'use client'

import { useState } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Sun, Moon, Plus, Wallet } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useToast } from '@/components/Toast'
import { HoldingSheet } from '@/components/HoldingSheet'
import { PortfolioChart, ChartLegend } from '@/components/PortfolioChart'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatUSD, formatKRW, formatPercent, cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function DashboardPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const { showToast } = useToast()
  const {
    groupedHoldings,
    prices,
    exchangeRate,
    exchangeRateError,
    summary,
    loading,
    refreshing,
    refreshPrices,
    updateManualPrice,
    updateManualExchangeRate,
    addHolding,
  } = usePortfolio()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [manualRate, setManualRate] = useState('')

  const currentRate = exchangeRate?.rate || 1350

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const handleRefresh = async () => {
    await refreshPrices()
    showToast('시세가 업데이트되었습니다.')
  }

  // 차트 데이터 준비
  const chartData = groupedHoldings.map((group) => {
    const currentPrice = prices[group.ticker]?.price || group.avgBuyPrice
    const valueUSD = group.totalQuantity * currentPrice
    return {
      ticker: group.ticker,
      value: valueUSD,
      percentage: summary.totalValueUSD > 0 ? (valueUSD / summary.totalValueUSD) * 100 : 0,
    }
  }).sort((a, b) => b.value - a.value)

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div className="text-muted-foreground">데이터 로딩 중...</div>
        </div>
      </div>
    )
  }

  // 빈 포트폴리오 안내
  if (groupedHoldings.length === 0) {
    return (
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">내 포트폴리오</h1>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={toggleTheme}>
            {resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="rounded-2xl bg-card p-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
            <Wallet className="h-10 w-10 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">포트폴리오를 시작하세요</h2>
          <p className="mb-8 text-muted-foreground">
            첫 번째 종목을 추가해서<br />투자 현황을 한눈에 확인하세요
          </p>
          <Button
            size="lg"
            className="h-12 px-8 text-base"
            onClick={() => setAddSheetOpen(true)}
          >
            <Plus className="mr-2 h-5 w-5" />
            첫 종목 추가하기
          </Button>
        </div>

        <HoldingSheet
          open={addSheetOpen}
          onOpenChange={setAddSheetOpen}
          holding={null}
          onSave={async (data) => {
            await addHolding(data as any)
            showToast('종목이 추가되었습니다.')
            setAddSheetOpen(false)
          }}
          currentRate={currentRate}
        />
      </div>
    )
  }

  const isProfit = summary.returnRateKRW >= 0

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">내 포트폴리오</h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={toggleTheme}>
            {resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 px-3 text-sm">
                시세 입력
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto rounded-t-2xl bg-card">
              <SheetHeader>
                <SheetTitle className="text-foreground">수동 시세 입력</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">현재 환율 (원/달러)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder={currentRate.toString()}
                      value={manualRate}
                      onChange={(e) => setManualRate(e.target.value)}
                      className="h-12 text-lg"
                    />
                    <Button
                      className="h-12 px-6"
                      onClick={() => {
                        if (manualRate) {
                          updateManualExchangeRate(Number(manualRate))
                          setManualRate('')
                          showToast('환율이 업데이트되었습니다.')
                        }
                      }}
                    >
                      적용
                    </Button>
                  </div>
                </div>
                <Separator className="bg-border" />
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">종목별 현재가 ($)</Label>
                  {groupedHoldings.map((g) => (
                    <ManualPriceInput
                      key={g.ticker}
                      ticker={g.ticker}
                      currentPrice={prices[g.ticker]?.price}
                      onUpdate={(ticker, price) => {
                        updateManualPrice(ticker, price)
                        showToast(`${ticker} 가격이 업데이트되었습니다.`)
                      }}
                    />
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* 총 평가액 - 그라데이션 카드 */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5">
        <p className="text-sm text-muted-foreground">총 평가금액</p>
        <span className="text-3xl font-bold text-foreground tabular-nums">
          {formatKRW(summary.totalValueKRW)}
        </span>
        <p className="mt-1 text-lg text-muted-foreground tabular-nums">
          {formatUSD(summary.totalValueUSD)}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
            isProfit ? 'bg-profit-light text-profit' : 'bg-loss-light text-loss'
          )}>
            {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{isProfit ? '+' : ''}{formatPercent(summary.returnRateKRW)}</span>
          </div>
          <span className={cn('text-sm font-medium tabular-nums', isProfit ? 'text-profit' : 'text-loss')}>
            {isProfit ? '+' : ''}{formatKRW(summary.totalProfitKRW)}
          </span>
        </div>
      </div>

      {/* 환율 정보 */}
      <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">환율</span>
          {exchangeRateError && (
            <span className="text-xs text-destructive">(조회 실패)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            ₩{currentRate.toLocaleString()}
          </span>
          {exchangeRate?.lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(exchangeRate.lastUpdated), 'HH:mm', { locale: ko })}
            </span>
          )}
        </div>
      </div>

      {/* 정보 카드 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card p-4">
          <p className="text-xs text-muted-foreground">투자금</p>
          <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">{formatKRW(summary.totalInvestmentKRW)}</p>
        </div>
        <div className="rounded-xl bg-card p-4">
          <p className="text-xs text-muted-foreground">총 수익</p>
          <p className={cn('mt-1 text-lg font-semibold tabular-nums', isProfit ? 'text-profit' : 'text-loss')}>
            {isProfit ? '+' : ''}{formatKRW(summary.totalProfitKRW)}
          </p>
        </div>
        <div className={cn('rounded-xl p-4', summary.stockProfit >= 0 ? 'bg-profit-light' : 'bg-loss-light')}>
          <p className="text-xs text-muted-foreground">주가 수익</p>
          <p className={cn('mt-1 text-lg font-semibold tabular-nums', summary.stockProfit >= 0 ? 'text-profit' : 'text-loss')}>
            {summary.stockProfit >= 0 ? '+' : ''}{formatKRW(summary.stockProfit)}
          </p>
        </div>
        <div className={cn('rounded-xl p-4', summary.exchangeProfit >= 0 ? 'bg-profit-light' : 'bg-loss-light')}>
          <p className="text-xs text-muted-foreground">환차익</p>
          <p className={cn('mt-1 text-lg font-semibold tabular-nums', summary.exchangeProfit >= 0 ? 'text-profit' : 'text-loss')}>
            {summary.exchangeProfit >= 0 ? '+' : ''}{formatKRW(summary.exchangeProfit)}
          </p>
        </div>
      </div>

      {/* 수익률 비교 */}
      <div className="rounded-xl bg-card p-4">
        <p className="text-xs text-muted-foreground mb-3">수익률</p>
        <div className="flex justify-around">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">달러 기준</p>
            <p className={cn('text-xl font-bold tabular-nums', summary.returnRateUSD >= 0 ? 'text-profit' : 'text-loss')}>
              {summary.returnRateUSD >= 0 ? '+' : ''}{formatPercent(summary.returnRateUSD)}
            </p>
          </div>
          <Separator orientation="vertical" className="h-12 bg-border" />
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">원화 기준</p>
            <p className={cn('text-xl font-bold tabular-nums', summary.returnRateKRW >= 0 ? 'text-profit' : 'text-loss')}>
              {summary.returnRateKRW >= 0 ? '+' : ''}{formatPercent(summary.returnRateKRW)}
            </p>
          </div>
        </div>
      </div>

      {/* 배당금 요약 */}
      {summary.totalDividends > 0 && (
        <div className="rounded-xl bg-card p-4">
          <p className="text-xs text-muted-foreground">총 배당 수입</p>
          <p className="mt-1 text-lg font-semibold text-dividend tabular-nums">
            {formatUSD(summary.totalDividends)}
          </p>
        </div>
      )}

      {/* 탭: 자산배분 / 보유종목 */}
      <Tabs defaultValue="portfolio" className="mt-4">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-xl">
          <TabsTrigger
            value="portfolio"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            자산배분
          </TabsTrigger>
          <TabsTrigger
            value="holdings"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            보유종목
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-4">
          {chartData.length > 0 && (
            <div className="rounded-xl bg-card p-4">
              <PortfolioChart data={chartData} totalValue={summary.totalValueUSD} />
              <ChartLegend data={chartData} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="holdings" className="mt-4 space-y-3">
          {groupedHoldings.map((group) => (
            <HoldingCard
              key={group.ticker}
              group={group}
              currentPrice={prices[group.ticker]?.price}
              currentRate={currentRate}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function HoldingCard({
  group,
  currentPrice,
  currentRate,
}: {
  group: import('@/types/database').GroupedHolding
  currentPrice?: number
  currentRate: number
}) {
  const price = currentPrice || group.avgBuyPrice
  const valueUSD = group.totalQuantity * price
  const investmentUSD = group.totalQuantity * group.avgBuyPrice
  const profitUSD = valueUSD - investmentUSD
  const returnRate = investmentUSD > 0 ? (profitUSD / investmentUSD) * 100 : 0
  const isProfit = returnRate >= 0

  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-4 transition-colors hover:bg-secondary">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
          {group.ticker.slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{group.ticker}</p>
          <p className="text-xs text-muted-foreground">{group.totalQuantity.toLocaleString()}주 보유</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-foreground tabular-nums">{formatUSD(valueUSD)}</p>
        <div className={cn(
          'flex items-center justify-end gap-1 text-xs tabular-nums',
          isProfit ? 'text-profit' : 'text-loss'
        )}>
          {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{isProfit ? '+' : ''}{formatPercent(returnRate)}</span>
        </div>
      </div>
    </div>
  )
}

function ManualPriceInput({
  ticker,
  currentPrice,
  onUpdate,
}: {
  ticker: string
  currentPrice?: number
  onUpdate: (ticker: string, price: number) => void
}) {
  const [value, setValue] = useState('')

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-sm font-semibold text-foreground">{ticker}</span>
      <Input
        type="number"
        inputMode="decimal"
        placeholder={currentPrice?.toString() || '현재가'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-12 flex-1 text-lg"
      />
      <Button
        className="h-12 px-4"
        onClick={() => {
          if (value) {
            onUpdate(ticker, Number(value))
            setValue('')
          }
        }}
      >
        적용
      </Button>
    </div>
  )
}
