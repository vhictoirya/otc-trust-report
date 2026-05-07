"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface Props {
  data: { label: string; value: number; color: string }[]
  totalPortfolio: number
}

export function ValueAtRiskBar({ data, totalPortfolio }: Props) {
  if (data.length === 0 || totalPortfolio === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
        No approval data
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            type="number"
            tick={{ fill: "#475569", fontSize: 10 }}
            tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v}`}
          />
          <YAxis type="category" dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} width={55} />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              color: "#e2e8f0",
              fontSize: "12px",
            }}
            formatter={(v) => [`$${Number(v).toLocaleString()}`]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 text-xs text-gray-500 text-center">
        Total portfolio: ${totalPortfolio.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  )
}
