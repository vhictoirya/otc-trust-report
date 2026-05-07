"use client"

import { formatUsd } from "@/lib/utils"
import type { TrustReport } from "@/lib/types"

interface Props {
  summary: TrustReport["summary"]
  isSolana?: boolean
}

export function SummaryStats({ summary, isSolana }: Props) {
  const stats = [
    {
      label: "Portfolio Value",
      value: formatUsd(summary.totalPortfolioUsd),
    },
    {
      label: "Active Chains",
      value: summary.activeChains.toString(),
    },
    {
      label: "Total Transactions",
      value: summary.totalTransactions.toLocaleString(),
    },
    {
      label: "On-Chain Volume",
      value: formatUsd(summary.totalVolumeUsd),
    },
    isSolana
      ? {
          label: "Token Delegates",
          value: "SPL (safe)",
          highlight: false,
          sub: "No unlimited approvals",
        }
      : {
          label: "Value at Risk",
          value: formatUsd(summary.valueAtRiskUsd),
          highlight: summary.valueAtRiskUsd > summary.totalPortfolioUsd * 0.3,
        },
    {
      label: "Blue Chip Ratio",
      value: `${(summary.blueChipRatio * 100).toFixed(0)}%`,
    },
    ...(summary.hyperliquidVolume > 0
      ? [{ label: "HL Volume (90d)", value: formatUsd(summary.hyperliquidVolume) }]
      : []),
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="glass rounded-xl p-4">
          <div className="text-gray-500 text-xs mb-1">{s.label}</div>
          <div className={`text-xl font-bold ${s.highlight ? "text-red-400" : "text-white"}`}>
            {s.value}
          </div>
          {"sub" in s && s.sub && (
            <div className="text-gray-600 text-xs mt-0.5">{s.sub}</div>
          )}
        </div>
      ))}
    </div>
  )
}
