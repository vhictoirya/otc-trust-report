"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { format, parseISO } from "date-fns"

interface Props {
  data: { date: string; volume: number; pnl: number }[]
}

export function HyperliquidChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
        No Hyperliquid activity in last 90 days
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#475569", fontSize: 10 }}
          tickFormatter={(d: string) => {
            try { return format(parseISO(d), "MMM d") } catch { return d }
          }}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="volume"
          orientation="left"
          tick={{ fill: "#475569", fontSize: 10 }}
          tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}`}
          width={55}
        />
        <YAxis
          yAxisId="pnl"
          orientation="right"
          tick={{ fill: "#475569", fontSize: 10 }}
          tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}`}
          width={55}
        />
        <Tooltip
          contentStyle={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            color: "#e2e8f0",
            fontSize: "12px",
          }}
          formatter={(v, name) => [`$${Number(v).toLocaleString()}`, String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
        <Bar yAxisId="volume" dataKey="volume" fill="#6366f1" opacity={0.7} name="Volume" radius={[2, 2, 0, 0]} />
        <Line
          yAxisId="pnl"
          type="monotone"
          dataKey="pnl"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          name="Daily PnL"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
