'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import { formatUSD, formatPercent } from '@/lib/utils'

// v0.dev 차트 색상 팔레트
const CHART_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#eab308', '#ef4444', '#06b6d4', '#f97316', '#ec4899']

interface ChartData {
  ticker: string
  value: number
  percentage: number
}

interface PortfolioChartProps {
  data: ChartData[]
  totalValue?: number
}

export function PortfolioChart({ data, totalValue }: PortfolioChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  if (data.length === 0) return null

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
          <p className="font-semibold text-foreground">{item.ticker}</p>
          <p className="text-sm text-muted-foreground">
            {formatUSD(item.value)}
          </p>
          <p className="text-sm font-medium text-primary">
            {formatPercent(item.percentage)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="relative h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                className="transition-opacity hover:opacity-80"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* 중앙 레이블 */}
      {totalValue !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-muted-foreground">총 평가액</p>
          <p className="text-lg font-bold text-foreground">{formatUSD(totalValue)}</p>
        </div>
      )}
    </div>
  )
}

// 범례 컴포넌트
export function ChartLegend({ data }: { data: ChartData[] }) {
  if (data.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      {data.map((item, index) => (
        <div key={item.ticker} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <span className="text-sm text-foreground">{item.ticker}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{formatPercent(item.percentage)}</span>
            <span className="text-sm font-medium text-foreground">{formatUSD(item.value)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
