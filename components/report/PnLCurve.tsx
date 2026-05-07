"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { format, parseISO } from "date-fns"

interface Props {
  data: { date: string; pnl: number; cumulative: number }[]
}

export function PnLCurve({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
        No transaction data
      </div>
    )
  }

  const isPositive = data[data.length - 1]?.cumulative >= 0

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
        <defs>
          <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
            <stop offset="95%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#475569", fontSize: 10 }}
          tickFormatter={(d: string) => {
            try { return format(parseISO(d), "MMM yy") } catch { return d }
          }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#475569", fontSize: 10 }}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(Math.round(v))}
          width={45}
        />
        <Tooltip
          contentStyle={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            color: "#e2e8f0",
            fontSize: "12px",
          }}
          formatter={(v) => [Number(v).toLocaleString(), "Cumulative Txs"]}
          labelFormatter={(l) => {
            const s = String(l)
            try { return format(parseISO(s), "dd MMM yyyy") } catch { return s }
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke={isPositive ? "#22c55e" : "#ef4444"}
          strokeWidth={2}
          fill="url(#pnlGradient)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
