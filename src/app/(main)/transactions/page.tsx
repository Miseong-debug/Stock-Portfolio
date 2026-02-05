'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ArrowLeftRight } from 'lucide-react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useToast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatUSD, formatKRW, cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Transaction } from '@/types/database'

const POPULAR_TICKERS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL']

export default function TransactionsPage() {
  const { transactions, exchangeRate, addTransaction, deleteTransaction } = usePortfolio()
  const { showToast } = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; ticker: string }>({
    open: false,
    id: '',
    ticker: '',
  })

  const currentRate = exchangeRate?.rate || 1350

  // 월별 그룹핑
  const groupedByMonth = transactions.reduce((acc, tx) => {
    const monthKey = format(parseISO(tx.tx_date), 'yyyy년 M월', { locale: ko })
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(tx)
    return acc
  }, {} as Record<string, Transaction[]>)

  const handleDeleteClick = (id: string, ticker: string) => {
    setDeleteConfirm({ open: true, id, ticker })
  }

  const handleDeleteConfirm = async () => {
    await deleteTransaction(deleteConfirm.id)
    showToast('거래내역이 삭제되었습니다.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">거래내역</h1>
        <Button onClick={() => setSheetOpen(true)} className="h-10 px-4">
          <Plus className="mr-1 h-4 w-4" />
          추가
        </Button>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <ArrowLeftRight className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg font-medium text-foreground">거래내역이 없습니다</p>
          <p className="mt-2 text-sm text-muted-foreground">상단의 추가 버튼을 눌러 거래를 기록해보세요.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByMonth).map(([month, txs]) => (
            <div key={month}>
              <h2 className="mb-3 text-xs font-semibold text-muted-foreground">{month}</h2>
              <div className="space-y-2">
                {txs.map((tx) => {
                  const isBuy = tx.tx_type === 'buy'
                  const totalUSD = Number(tx.quantity) * Number(tx.price)
                  const totalKRW = totalUSD * Number(tx.exchange_rate)

                  return (
                    <div key={tx.id} className="flex items-center justify-between rounded-xl bg-card p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold',
                          isBuy ? 'bg-profit-light text-profit' : 'bg-loss-light text-loss'
                        )}>
                          {isBuy ? '매수' : '매도'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{tx.ticker}</span>
                            {tx.company_name && (
                              <span className="text-xs text-muted-foreground">{tx.company_name}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(parseISO(tx.tx_date), 'MM.dd')} · {Number(tx.quantity).toLocaleString()}주 × {formatUSD(Number(tx.price))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-foreground tabular-nums">{formatUSD(totalUSD)}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {formatKRW(totalKRW)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteClick(tx.id, tx.ticker)}
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
      <TransactionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={async (data) => {
          await addTransaction(data as any)
          showToast('거래내역이 추가되었습니다.')
          setSheetOpen(false)
        }}
        currentRate={currentRate}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}
        title="거래내역 삭제"
        description={`${deleteConfirm.ticker} 거래내역을 정말 삭제하시겠습니까?`}
        confirmText="삭제"
        onConfirm={handleDeleteConfirm}
        destructive
      />
    </div>
  )
}

function TransactionSheet({
  open,
  onOpenChange,
  onSave,
  currentRate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<Transaction>) => Promise<void>
  currentRate: number
}) {
  const [txType, setTxType] = useState<'buy' | 'sell'>('buy')
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [exchangeRateValue, setExchangeRateValue] = useState('')
  const [txDate, setTxDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTxType('buy')
      setTicker('')
      setCompanyName('')
      setQuantity('')
      setPrice('')
      setExchangeRateValue(currentRate.toString())
      setTxDate(format(new Date(), 'yyyy-MM-dd'))
      setMemo('')
    }
  }, [open, currentRate])

  const handleSubmit = async () => {
    if (!ticker || !quantity || !price || !exchangeRateValue || !txDate) return
    setSaving(true)
    try {
      await onSave({
        tx_type: txType,
        ticker: ticker.toUpperCase(),
        company_name: companyName,
        quantity: Number(quantity),
        price: Number(price),
        exchange_rate: Number(exchangeRateValue),
        tx_date: txDate,
        memo,
      })
    } finally {
      setSaving(false)
    }
  }

  const totalUSD = quantity && price ? Number(quantity) * Number(price) : 0
  const totalKRW = totalUSD * (Number(exchangeRateValue) || currentRate)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-2xl bg-card">
        <SheetHeader>
          <SheetTitle className="text-foreground">거래내역 추가</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <Tabs value={txType} onValueChange={(v) => setTxType(v as 'buy' | 'sell')}>
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-xl h-12">
              <TabsTrigger value="buy" className="rounded-lg text-sm data-[state=active]:bg-profit data-[state=active]:text-white">
                매수
              </TabsTrigger>
              <TabsTrigger value="sell" className="rounded-lg text-sm data-[state=active]:bg-loss data-[state=active]:text-white">
                매도
              </TabsTrigger>
            </TabsList>
          </Tabs>

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
              <Label className="text-xs text-muted-foreground">단가 ($) *</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="150.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">환율 (원/$) *</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="1350"
                value={exchangeRateValue}
                onChange={(e) => setExchangeRateValue(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">거래일 *</Label>
              <Input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
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

          {totalUSD > 0 && (
            <div className="rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">{txType === 'buy' ? '매수' : '매도'}금액</p>
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
            disabled={saving || !ticker || !quantity || !price || !exchangeRateValue || !txDate}
          >
            {saving ? '저장 중...' : '추가'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
