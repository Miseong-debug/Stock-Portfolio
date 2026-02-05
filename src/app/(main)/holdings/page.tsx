'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Briefcase } from 'lucide-react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useToast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { HoldingSheet } from '@/components/HoldingSheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatUSD, formatKRW, formatPercent, cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Holding } from '@/types/database'

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
        <h1 className="text-xl font-bold text-foreground">보유종목</h1>
        <Button onClick={handleAdd} className="h-10 px-4">
          <Plus className="mr-1 h-4 w-4" />
          추가
        </Button>
      </div>

      {groupedHoldings.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg font-medium text-foreground">보유종목이 없습니다</p>
          <p className="mt-2 text-sm text-muted-foreground">상단의 추가 버튼을 눌러 종목을 추가해보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedHoldings.map((group) => {
            const isExpanded = expandedTickers.has(group.ticker)
            const currentPrice = prices[group.ticker]?.price || group.avgBuyPrice
            const valueUSD = group.totalQuantity * currentPrice
            const investmentUSD = group.totalQuantity * group.avgBuyPrice
            const profitUSD = valueUSD - investmentUSD
            const returnRate = investmentUSD > 0 ? (profitUSD / investmentUSD) * 100 : 0
            const isProfit = profitUSD >= 0
            const valueKRW = valueUSD * currentRate

            return (
              <div key={group.ticker} className="rounded-xl bg-card overflow-hidden">
                {/* 헤더 */}
                <button
                  className="flex w-full items-center justify-between p-4 text-left"
                  onClick={() => toggleExpanded(group.ticker)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                      {group.ticker.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{group.ticker}</span>
                        {group.company_name && (
                          <span className="text-xs text-muted-foreground">{group.company_name}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {group.totalQuantity.toLocaleString()}주 · 평단 {formatUSD(group.avgBuyPrice)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground tabular-nums">{formatUSD(valueUSD)}</div>
                      <div className={cn(
                        'flex items-center justify-end gap-1 text-xs font-medium tabular-nums',
                        isProfit ? 'text-profit' : 'text-loss'
                      )}>
                        {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{isProfit ? '+' : ''}{formatPercent(returnRate)}</span>
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
                  <div className="space-y-2 border-t border-border bg-secondary/30 p-4">
                    {group.holdings.map((holding) => {
                      const qty = Number(holding.quantity)
                      const buyPrice = Number(holding.buy_price)
                      const buyRate = Number(holding.buy_exchange_rate)
                      const investKRW = qty * buyPrice * buyRate
                      const lotProfitUSD = qty * (currentPrice - buyPrice)
                      const lotReturnRate = buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0
                      const exchangeProfit = qty * currentPrice * (currentRate - buyRate)
                      const isLotProfit = lotProfitUSD >= 0

                      return (
                        <div
                          key={holding.id}
                          className="rounded-lg bg-card p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {format(new Date(holding.buy_date), 'yyyy.MM.dd')}
                                </Badge>
                                <span className="text-sm font-medium text-foreground">{qty.toLocaleString()}주</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                매수가 {formatUSD(buyPrice)} · 환율 ₩{buyRate.toLocaleString()}
                              </div>
                              {holding.memo && (
                                <div className="text-xs text-muted-foreground">{holding.memo}</div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(holding)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeleteClick(holding.id, holding.ticker)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">투자금 {formatKRW(investKRW)}</span>
                            <span className={cn(
                              'rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums',
                              isLotProfit ? 'bg-profit-light text-profit' : 'bg-loss-light text-loss'
                            )}>
                              {isLotProfit ? '+' : ''}{formatPercent(lotReturnRate)}
                            </span>
                          </div>
                          <div className="mt-1 flex gap-3 text-xs">
                            <span className={cn('tabular-nums', lotProfitUSD >= 0 ? 'text-profit' : 'text-loss')}>
                              주가수익 {lotProfitUSD >= 0 ? '+' : ''}{formatKRW(lotProfitUSD * buyRate)}
                            </span>
                            <span className={cn('tabular-nums', exchangeProfit >= 0 ? 'text-profit' : 'text-loss')}>
                              환차익 {exchangeProfit >= 0 ? '+' : ''}{formatKRW(exchangeProfit)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
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
