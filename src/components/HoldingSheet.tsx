'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatUSD, formatKRW } from '@/lib/utils'
import { format } from 'date-fns'
import { Holding } from '@/types/database'

// 자주 사용하는 티커
const POPULAR_TICKERS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL']

interface HoldingSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  holding: Holding | null
  onSave: (data: Partial<Holding>) => Promise<void>
  currentRate: number
}

export function HoldingSheet({
  open,
  onOpenChange,
  holding,
  onSave,
  currentRate,
}: HoldingSheetProps) {
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [buyExchangeRate, setBuyExchangeRate] = useState('')
  const [buyDate, setBuyDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)

  // 시트가 열릴 때 폼 초기화
  useEffect(() => {
    if (open) {
      if (holding) {
        setTicker(holding.ticker)
        setCompanyName(holding.company_name || '')
        setQuantity(holding.quantity?.toString() || '')
        setBuyPrice(holding.buy_price?.toString() || '')
        setBuyExchangeRate(holding.buy_exchange_rate?.toString() || '')
        setBuyDate(holding.buy_date || format(new Date(), 'yyyy-MM-dd'))
        setMemo(holding.memo || '')
      } else {
        setTicker('')
        setCompanyName('')
        setQuantity('')
        setBuyPrice('')
        setBuyExchangeRate(currentRate.toString())
        setBuyDate(format(new Date(), 'yyyy-MM-dd'))
        setMemo('')
      }
    }
  }, [open, holding, currentRate])

  const handleTickerSelect = (t: string) => {
    setTicker(t)
  }

  const handleSubmit = async () => {
    if (!ticker || !quantity || !buyPrice || !buyExchangeRate || !buyDate) return
    setSaving(true)
    try {
      await onSave({
        ticker: ticker.toUpperCase(),
        company_name: companyName,
        quantity: Number(quantity),
        buy_price: Number(buyPrice),
        buy_exchange_rate: Number(buyExchangeRate),
        buy_date: buyDate,
        memo,
      })
    } finally {
      setSaving(false)
    }
  }

  const totalUSD = quantity && buyPrice ? Number(quantity) * Number(buyPrice) : 0
  const totalKRW = totalUSD * (Number(buyExchangeRate) || currentRate)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-2xl bg-card">
        <SheetHeader>
          <SheetTitle className="text-foreground">{holding ? '보유종목 수정' : '보유종목 추가'}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {/* 빠른 티커 선택 */}
          {!holding && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">자주 사용하는 종목</Label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TICKERS.map((t) => (
                  <Button
                    key={t}
                    variant={ticker === t ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 px-3"
                    onClick={() => handleTickerSelect(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
          )}

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
              <Label className="text-xs text-muted-foreground">수량 *</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">매수가 ($) *</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="150.00"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">매수환율 (원/$) *</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="1350"
                value={buyExchangeRate}
                onChange={(e) => setBuyExchangeRate(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">매수일 *</Label>
              <Input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="h-12 text-base"
              />
            </div>
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

          {/* 매수 금액 미리보기 */}
          {totalUSD > 0 && (
            <div className="rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">투자금액</p>
              <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
                {formatUSD(totalUSD)}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                = {formatKRW(totalKRW)}
              </p>
            </div>
          )}

          <Button
            className="h-12 w-full text-base"
            onClick={handleSubmit}
            disabled={saving || !ticker || !quantity || !buyPrice || !buyExchangeRate || !buyDate}
          >
            {saving ? '저장 중...' : holding ? '수정' : '추가'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
