'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useToast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { formatUSD, formatKRW, cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Holding } from '@/types/database'

// 자주 사용하는 티커
const POPULAR_TICKERS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL']

export default function HoldingsPage() {
  const {
    groupedHoldings,
    prices,
    exchangeRate,
    addHolding,
    updateHolding,
    deleteHolding,
  } = usePortfolio()
  const { showToast } = useToast()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; ticker: string }>({
    open: false,
    id: '',
    ticker: '',
  })

  const currentRate = exchangeRate?.rate || 1350

  const toggleExpanded = (ticker: string) => {
    setExpandedTickers((prev) => {
      const next = new Set(prev)
      if (next.has(ticker)) {
        next.delete(ticker)
      } else {
        next.add(ticker)
      }
      return next
    })
  }

  const handleEdit = (holding: Holding) => {
    setEditingHolding(holding)
    setSheetOpen(true)
  }

  const handleAdd = () => {
    setEditingHolding(null)
    setSheetOpen(true)
  }

  const handleDeleteClick = (id: string, ticker: string) => {
    setDeleteConfirm({ open: true, id, ticker })
  }

  const handleDeleteConfirm = async () => {
    await deleteHolding(deleteConfirm.id)
    showToast('종목이 삭제되었습니다.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">보유종목</h1>
        <Button onClick={handleAdd} className="h-11 px-4 text-base">
          <Plus className="mr-1 h-5 w-5" />
          추가
        </Button>
      </div>

      {groupedHoldings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg">보유종목이 없습니다.</p>
            <p className="mt-2">상단의 추가 버튼을 눌러 종목을 추가해보세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedHoldings.map((group) => {
            const isExpanded = expandedTickers.has(group.ticker)
            const currentPrice = prices[group.ticker]?.price || group.avgBuyPrice
            const valueUSD = group.totalQuantity * currentPrice
            const investmentKRW = group.holdings.reduce(
              (sum, h) => sum + Number(h.quantity) * Number(h.buy_price) * Number(h.buy_exchange_rate),
              0
            )
            const valueKRW = valueUSD * currentRate

            return (
              <Card key={group.ticker}>
                <CardContent className="py-4">
                  {/* 헤더 */}
                  <button
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => toggleExpanded(group.ticker)}
                  >
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
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold tabular-nums">{formatUSD(valueUSD)}</div>
                        <div className="text-sm text-muted-foreground tabular-nums">
                          {formatKRW(valueKRW)}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* 상세 로트 목록 */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {group.holdings.map((holding) => {
                        const qty = Number(holding.quantity)
                        const buyPrice = Number(holding.buy_price)
                        const buyRate = Number(holding.buy_exchange_rate)
                        const investKRW = qty * buyPrice * buyRate
                        const profitUSD = qty * (currentPrice - buyPrice)
                        const exchangeProfit = qty * currentPrice * (currentRate - buyRate)

                        return (
                          <div
                            key={holding.id}
                            className="rounded-lg bg-muted/50 p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-sm">
                                    {format(new Date(holding.buy_date), 'yyyy.MM.dd')}
                                  </Badge>
                                  <span className="font-medium">{qty.toLocaleString()}주</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  매수가 {formatUSD(buyPrice)} · 환율 ₩{buyRate.toLocaleString()}
                                </div>
                                {holding.memo && (
                                  <div className="text-sm text-muted-foreground">{holding.memo}</div>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10"
                                  onClick={() => handleEdit(holding)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 text-destructive"
                                  onClick={() => handleDeleteClick(holding.id, holding.ticker)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-sm">
                              <span className="text-muted-foreground">투자금 {formatKRW(investKRW)}</span>
                              <span className={cn('tabular-nums', profitUSD >= 0 ? 'text-profit' : 'text-loss')}>
                                주가수익 {formatKRW(profitUSD * buyRate)}
                              </span>
                              <span className={cn('tabular-nums', exchangeProfit >= 0 ? 'text-profit' : 'text-loss')}>
                                환차익 {formatKRW(exchangeProfit)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 추가/수정 시트 */}
      <HoldingSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        holding={editingHolding}
        onSave={async (data) => {
          if (editingHolding) {
            await updateHolding(editingHolding.id, data)
            showToast('종목이 수정되었습니다.')
          } else {
            await addHolding(data as any)
            showToast('종목이 추가되었습니다.')
          }
          setSheetOpen(false)
          setEditingHolding(null)
        }}
        currentRate={currentRate}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}
        title="종목 삭제"
        description={`${deleteConfirm.ticker} 종목을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        onConfirm={handleDeleteConfirm}
        destructive
      />
    </div>
  )
}

function HoldingSheet({
  open,
  onOpenChange,
  holding,
  onSave,
  currentRate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  holding: Holding | null
  onSave: (data: Partial<Holding>) => Promise<void>
  currentRate: number
}) {
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
      <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{holding ? '보유종목 수정' : '보유종목 추가'}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {/* 빠른 티커 선택 */}
          {!holding && (
            <div className="space-y-2">
              <Label className="text-base">자주 사용하는 종목</Label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TICKERS.map((t) => (
                  <Button
                    key={t}
                    variant={ticker === t ? 'default' : 'outline'}
                    size="sm"
                    className="h-10 px-4"
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
              <Label className="text-base">수량 *</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">매수가 ($) *</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="150.00"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-base">매수환율 (원/$) *</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="1350"
                value={buyExchangeRate}
                onChange={(e) => setBuyExchangeRate(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">매수일 *</Label>
              <Input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
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

          {/* 매수 금액 미리보기 */}
          {totalUSD > 0 && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="text-sm text-muted-foreground">투자금액</div>
              <div className="text-xl font-bold">
                {formatUSD(totalUSD)}
              </div>
              <div className="text-lg text-muted-foreground">
                = {formatKRW(totalKRW)}
              </div>
            </div>
          )}

          <Button
            className="h-14 w-full text-lg"
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
