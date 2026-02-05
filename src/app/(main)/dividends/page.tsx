'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Coins } from 'lucide-react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useToast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { formatUSD, formatKRW } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { Dividend } from '@/types/database'

const POPULAR_TICKERS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL']

export default function DividendsPage() {
  const { dividends, exchangeRate, addDividend, deleteDividend, summary } = usePortfolio()
  const { showToast } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; ticker: string }>({
    open: false,
    id: '',
    ticker: '',
  })

  const currentRate = exchangeRate?.rate || 1350

  // 종목별 그룹핑
  const groupedByTicker = dividends.reduce((acc, div) => {
    if (!acc[div.ticker]) {
      acc[div.ticker] = {
        ticker: div.ticker,
        company_name: div.company_name,
        total: 0,
        dividends: [],
      }
    }
    acc[div.ticker].total += Number(div.amount)
    acc[div.ticker].dividends.push(div)
    return acc
  }, {} as Record<string, { ticker: string; company_name: string; total: number; dividends: Dividend[] }>)

  const handleDeleteClick = (id: string, ticker: string) => {
    setDeleteConfirm({ open: true, id, ticker })
  }

  const handleDeleteConfirm = async () => {
    await deleteDividend(deleteConfirm.id)
    showToast('배당금 기록이 삭제되었습니다.')
  }

  // 총 배당금 (원화)
  const totalDividendsKRW = dividends.reduce((sum, d) => {
    const rate = d.exchange_rate || currentRate
    return sum + Number(d.amount) * Number(rate)
  }, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">배당금</h1>
        <Button onClick={() => setSheetOpen(true)} className="h-11 px-4 text-base">
          <Plus className="mr-1 h-5 w-5" />
          추가
        </Button>
      </div>

      {/* 총 배당금 요약 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5" />
            총 배당 수입
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tabular-nums text-profit">
            {formatUSD(summary.totalDividends)}
          </div>
          <div className="text-lg text-muted-foreground tabular-nums">
            {formatKRW(totalDividendsKRW)}
          </div>
        </CardContent>
      </Card>

      {dividends.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg">배당금 기록이 없습니다.</p>
            <p className="mt-2">상단의 추가 버튼을 눌러 배당금을 기록해보세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.values(groupedByTicker).map((group) => (
            <Card key={group.ticker}>
              <CardContent className="py-4">
                {/* 헤더 */}
                <div className="flex items-center justify-between border-b pb-3 mb-3">
                  <div>
                    <span className="text-lg font-bold">{group.ticker}</span>
                    {group.company_name && (
                      <span className="ml-2 text-sm text-muted-foreground">{group.company_name}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold tabular-nums text-profit">{formatUSD(group.total)}</div>
                    <div className="text-sm text-muted-foreground">{group.dividends.length}건</div>
                  </div>
                </div>

                {/* 배당금 목록 */}
                <div className="space-y-3">
                  {group.dividends.map((div) => {
                    const rate = div.exchange_rate || currentRate
                    const amountKRW = Number(div.amount) * Number(rate)

                    return (
                      <div
                        key={div.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm">
                              {format(parseISO(div.received_date), 'yyyy.MM.dd')}
                            </Badge>
                            <span className="font-semibold tabular-nums">{formatUSD(Number(div.amount))}</span>
                            {div.exchange_rate && (
                              <span className="text-sm text-muted-foreground">
                                @₩{Number(div.exchange_rate).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {div.memo && (
                            <div className="text-sm text-muted-foreground">{div.memo}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {formatKRW(amountKRW)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-destructive"
                            onClick={() => handleDeleteClick(div.id, div.ticker)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 추가 시트 */}
      <DividendSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={async (data) => {
          await addDividend(data as any)
          showToast('배당금이 추가되었습니다.')
          setSheetOpen(false)
        }}
        currentRate={currentRate}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}
        title="배당금 삭제"
        description={`${deleteConfirm.ticker} 배당금 기록을 정말 삭제하시겠습니까?`}
        confirmText="삭제"
        onConfirm={handleDeleteConfirm}
        destructive
      />
    </div>
  )
}

function DividendSheet({
  open,
  onOpenChange,
  onSave,
  currentRate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<Dividend>) => Promise<void>
  currentRate: number
}) {
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [amount, setAmount] = useState('')
  const [exchangeRateValue, setExchangeRateValue] = useState('')
  const [receivedDate, setReceivedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTicker('')
      setCompanyName('')
      setAmount('')
      setExchangeRateValue('')
      setReceivedDate(format(new Date(), 'yyyy-MM-dd'))
      setMemo('')
    }
  }, [open])

  const handleSubmit = async () => {
    if (!ticker || !amount || !receivedDate) return
    setSaving(true)
    try {
      await onSave({
        ticker: ticker.toUpperCase(),
        company_name: companyName,
        amount: Number(amount),
        exchange_rate: exchangeRateValue ? Number(exchangeRateValue) : null,
        received_date: receivedDate,
        memo,
      })
    } finally {
      setSaving(false)
    }
  }

  const rate = exchangeRateValue ? Number(exchangeRateValue) : currentRate
  const amountKRW = amount ? Number(amount) * rate : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">배당금 추가</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {/* 빠른 티커 선택 */}
          <div className="space-y-2">
            <Label className="text-base">자주 사용하는 종목</Label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TICKERS.map((t) => (
                <Button
                  key={t}
                  variant={ticker === t ? 'default' : 'outline'}
                  size="sm"
                  className="h-10 px-4"
                  onClick={() => setTicker(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-base">티커 *</Label>
              <Input
                placeholder="AAPL"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="h-12 text-lg uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">회사명</Label>
              <Input
                placeholder="Apple Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-base">배당금액 ($) *</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="12.50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">환율 (원/$)</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder={currentRate.toString()}
                value={exchangeRateValue}
                onChange={(e) => setExchangeRateValue(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base">수령일 *</Label>
            <Input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="h-12 text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">메모</Label>
            <Input
              placeholder="메모 (선택사항)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="h-12 text-lg"
            />
          </div>

          {amountKRW > 0 && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="text-sm text-muted-foreground">원화 환산</div>
              <div className="text-xl font-bold">
                {formatUSD(Number(amount))}
              </div>
              <div className="text-lg text-muted-foreground">
                = {formatKRW(amountKRW)}
              </div>
            </div>
          )}

          <Button
            className="h-14 w-full text-lg"
            onClick={handleSubmit}
            disabled={saving || !ticker || !amount || !receivedDate}
          >
            {saving ? '저장 중...' : '추가'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
