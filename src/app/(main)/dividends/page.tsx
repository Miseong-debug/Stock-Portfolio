'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Coins } from 'lucide-react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useToast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
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
        <h1 className="text-xl font-bold text-foreground">배당금</h1>
        <Button onClick={() => setSheetOpen(true)} className="h-10 px-4">
          <Plus className="mr-1 h-4 w-4" />
          추가
        </Button>
      </div>

      {/* 총 배당금 요약 */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6">
        <div className="flex items-center gap-2 mb-2">
          <Coins className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">총 배당 수입</span>
        </div>
        <div className="text-3xl font-bold text-foreground tabular-nums">
          {formatUSD(summary.totalDividends)}
        </div>
        <div className="text-base text-muted-foreground tabular-nums mt-1">
          {formatKRW(totalDividendsKRW)}
        </div>
      </div>

      {dividends.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <Coins className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg font-medium text-foreground">배당금 기록이 없습니다</p>
          <p className="mt-2 text-sm text-muted-foreground">상단의 추가 버튼을 눌러 배당금을 기록해보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.values(groupedByTicker).map((group) => (
            <div key={group.ticker} className="rounded-xl bg-card p-4">
              {/* 헤더 */}
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                    {group.ticker.slice(0, 2)}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">{group.ticker}</span>
                    {group.company_name && (
                      <span className="ml-2 text-xs text-muted-foreground">{group.company_name}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-primary tabular-nums">{formatUSD(group.total)}</div>
                  <div className="text-xs text-muted-foreground">{group.dividends.length}건</div>
                </div>
              </div>

              {/* 배당금 목록 */}
              <div className="space-y-2">
                {group.dividends.map((div) => {
                  const rate = div.exchange_rate || currentRate
                  const amountKRW = Number(div.amount) * Number(rate)

                  return (
                    <div
                      key={div.id}
                      className="flex items-center justify-between rounded-lg bg-secondary/30 p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {format(parseISO(div.received_date), 'yyyy.MM.dd')}
                          </Badge>
                          <span className="text-sm font-medium text-primary tabular-nums">{formatUSD(Number(div.amount))}</span>
                          {div.exchange_rate && (
                            <span className="text-xs text-muted-foreground">
                              @₩{Number(div.exchange_rate).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {div.memo && (
                          <div className="text-xs text-muted-foreground">{div.memo}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatKRW(amountKRW)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteClick(div.id, div.ticker)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
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
      <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-2xl bg-card">
        <SheetHeader>
          <SheetTitle className="text-foreground">배당금 추가</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {/* 빠른 티커 선택 */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">자주 사용하는 종목</Label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TICKERS.map((t) => (
                <Button
                  key={t}
                  variant={ticker === t ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => setTicker(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">티커 *</Label>
              <Input
                placeholder="AAPL"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="h-12 text-base uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">회사명</Label>
              <Input
                placeholder="Apple Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">배당금액 ($) *</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="12.50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">환율 (원/$)</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder={currentRate.toString()}
                value={exchangeRateValue}
                onChange={(e) => setExchangeRateValue(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">수령일 *</Label>
            <Input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">메모</Label>
            <Input
              placeholder="메모 (선택사항)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {amountKRW > 0 && (
            <div className="rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">원화 환산</p>
              <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
                {formatUSD(Number(amount))}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                = {formatKRW(amountKRW)}
              </p>
            </div>
          )}

          <Button
            className="h-12 w-full text-base"
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
