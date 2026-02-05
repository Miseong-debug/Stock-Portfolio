'use client'

import { useState } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Coins, Sun, Moon, Plus } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useToast } from '@/components/Toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatUSD, formatKRW, formatPercent, cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'

export default function DashboardPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const { showToast } = useToast()
  const {
    groupedHoldings,
    prices,
    exchangeRate,
    summary,
    loading,
    refreshing,
    refreshPrices,
    updateManualPrice,
    updateManualExchangeRate,
  } = usePortfolio()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [manualRate, setManualRate] = useState('')

  const currentRate = exchangeRate?.rate || 1350

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const handleRefresh = async () => {
    await refreshPrices()
    showToast('시세가 업데이트되었습니다.')
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-lg text-muted-foreground">데이터 로딩 중...</div>
      </div>
    )
  }

  // 빈 포트폴리오 안내
  if (groupedHoldings.length === 0) {
    return (
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">내 포트폴리오</h1>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Coins className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">아직 보유 종목이 없습니다</h2>
            <p className="mb-6 text-muted-foreground">
              첫 번째 종목을 추가해서<br />포트폴리오를 시작해보세요!
            </p>
            <Link href="/holdings">
              <Button size="lg" className="h-12 px-8 text-base">
                <Plus className="mr-2 h-5 w-5" />
                종목 추가하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 포트폴리오</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
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
            <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>수동 시세 입력</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-base">현재 환율 (원/달러)</Label>
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
                <Separator />
                <div className="space-y-3">
                  <Label className="text-base">종목별 현재가 ($)</Label>
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

      {/* 환율 정보 */}
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
        <span className="text-muted-foreground">현재 환율</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tabular-nums">
            ₩{currentRate.toLocaleString()}/USD
          </span>
          {exchangeRate?.lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(exchangeRate.lastUpdated), 'HH:mm', { locale: ko })}
            </span>
          )}
        </div>
      </div>

      {/* 포트폴리오 요약 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">총 평가액</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-3xl font-bold tabular-nums">
              {formatUSD(summary.totalValueUSD)}
            </div>
            <div className="text-xl text-muted-foreground tabular-nums">
              {formatKRW(summary.totalValueKRW)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">투자금</div>
              <div className="text-lg font-semibold tabular-nums">{formatUSD(summary.totalInvestmentUSD)}</div>
              <div className="text-sm text-muted-foreground tabular-nums">{formatKRW(summary.totalInvestmentKRW)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">총 수익</div>
              <div className={cn('text-lg font-semibold tabular-nums', summary.totalProfitKRW >= 0 ? 'text-profit' : 'text-loss')}>
                {formatKRW(summary.totalProfitKRW)}
              </div>
              <div className={cn('text-sm tabular-nums', summary.returnRateKRW >= 0 ? 'text-profit' : 'text-loss')}>
                {formatPercent(summary.returnRateKRW)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 수익 분석 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            수익 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                주가 수익
              </div>
              <div className={cn('text-xl font-bold tabular-nums', summary.stockProfit >= 0 ? 'text-profit' : 'text-loss')}>
                {formatKRW(summary.stockProfit)}
              </div>
              <div className="text-xs text-muted-foreground">매수환율 기준</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Coins className="h-4 w-4" />
                환차익
              </div>
              <div className={cn('text-xl font-bold tabular-nums', summary.exchangeProfit >= 0 ? 'text-profit' : 'text-loss')}>
                {formatKRW(summary.exchangeProfit)}
              </div>
              <div className="text-xs text-muted-foreground">환율 변동분</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 수익률 비교 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">수익률</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-around">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">달러 기준</div>
              <div className={cn('text-2xl font-bold tabular-nums', summary.returnRateUSD >= 0 ? 'text-profit' : 'text-loss')}>
                {formatPercent(summary.returnRateUSD)}
              </div>
            </div>
            <Separator orientation="vertical" className="h-14" />
            <div className="text-center">
              <div className="text-sm text-muted-foreground">원화 기준</div>
              <div className={cn('text-2xl font-bold tabular-nums', summary.returnRateKRW >= 0 ? 'text-profit' : 'text-loss')}>
                {formatPercent(summary.returnRateKRW)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 배당금 요약 */}
      {summary.totalDividends > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5" />
              총 배당 수입
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-profit">
              {formatUSD(summary.totalDividends)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 보유 종목 리스트 */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">보유 종목</h2>
        {groupedHoldings.map((group) => (
          <HoldingCard
            key={group.ticker}
            group={group}
            currentPrice={prices[group.ticker]?.price}
            currentRate={currentRate}
          />
        ))}
      </div>
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

  // 환차익 계산
  const exchangeProfit = group.holdings.reduce((sum, h) => {
    const qty = Number(h.quantity)
    const buyRate = Number(h.buy_exchange_rate)
    return sum + qty * price * (currentRate - buyRate)
  }, 0)

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{group.ticker}</span>
              {group.company_name && (
                <span className="text-sm text-muted-foreground">{group.company_name}</span>
              )}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {group.totalQuantity.toLocaleString()}주 · 평단 {formatUSD(group.avgBuyPrice)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums">{formatUSD(valueUSD)}</div>
            <div className={cn('text-base font-semibold tabular-nums', returnRate >= 0 ? 'text-profit' : 'text-loss')}>
              {formatPercent(returnRate)}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Badge variant="secondary" className="text-sm tabular-nums">
            현재가 {currentPrice ? formatUSD(currentPrice) : '미입력'}
          </Badge>
          <Badge
            variant="outline"
            className={cn('text-sm tabular-nums', exchangeProfit >= 0 ? 'border-profit/30 text-profit' : 'border-loss/30 text-loss')}
          >
            환차익 {formatKRW(exchangeProfit)}
          </Badge>
        </div>
      </CardContent>
    </Card>
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
      <span className="w-20 text-base font-semibold">{ticker}</span>
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
