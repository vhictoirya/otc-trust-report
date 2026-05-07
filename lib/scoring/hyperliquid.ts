import type { PillarScore } from "../types"
import type { HyperliquidState } from "../types"
import type { HLFillsResponse, HLDelegatorSummary } from "../hyperliquid/client"
import { format } from "date-fns"

export function scoreHyperliquid(
  state: HyperliquidState | null,
  fills: HLFillsResponse[],
  delegator: HLDelegatorSummary | null
): PillarScore {
  const signals: PillarScore["signals"] = []
  let score = 0

  if (!state && fills.length === 0 && !delegator) {
    signals.push({ label: "Hyperliquid Activity", value: "No activity found", impact: "neutral" })
    return { score: 5, maxScore: 10, signals } // neutral baseline for no HL usage
  }

  // Perp trading history
  const totalVolume = fills.reduce((sum, f) => sum + parseFloat(f.sz) * parseFloat(f.px), 0)
  let volumePts = 0
  if (totalVolume >= 10_000_000) volumePts = 4
  else if (totalVolume >= 1_000_000) volumePts = 3
  else if (totalVolume >= 100_000) volumePts = 2
  else if (totalVolume > 0) volumePts = 1
  score += volumePts
  signals.push({
    label: "Perp Trading Volume (90d)",
    value: formatUsd(totalVolume),
    impact: volumePts >= 3 ? "positive" : volumePts >= 1 ? "neutral" : "negative",
  })

  // Margin health
  if (state) {
    const accountValue = parseFloat(state.marginSummary.accountValue)
    const marginUsed = parseFloat(state.marginSummary.totalMarginUsed)
    const marginRatio = accountValue > 0 ? marginUsed / accountValue : 0

    let marginPts = 0
    if (!state.liquidated && marginRatio <= 0.3) marginPts = 4
    else if (!state.liquidated && marginRatio <= 0.6) marginPts = 2
    else if (state.liquidated) marginPts = -4
    score += marginPts
    signals.push({
      label: "Margin Health",
      value: state.liquidated ? "Liquidated" : `${(marginRatio * 100).toFixed(0)}% used`,
      impact: marginPts >= 3 ? "positive" : marginPts >= 0 ? "neutral" : "negative",
    })
  }

  // Delegation / staking
  if (delegator) {
    const delegated = parseFloat(delegator.delegated)
    const delegatePts = delegated >= 1000 ? 2 : delegated > 0 ? 1 : 0
    score += delegatePts
    signals.push({
      label: "Staking / Delegation",
      value: delegated > 0 ? `${delegated.toFixed(0)} delegated` : "None",
      impact: delegatePts >= 1 ? "positive" : "neutral",
    })
  }

  return { score: Math.max(0, Math.min(score, 10)), maxScore: 10, signals }
}

export function getHyperliquidChartData(
  fills: HLFillsResponse[]
): { date: string; volume: number; pnl: number }[] {
  const byDay: Record<string, { volume: number; pnl: number }> = {}

  for (const fill of fills) {
    const day = format(new Date(fill.time), "yyyy-MM-dd")
    const vol = parseFloat(fill.sz) * parseFloat(fill.px)
    const pnl = parseFloat(fill.closedPnl)
    if (!byDay[day]) byDay[day] = { volume: 0, pnl: 0 }
    byDay[day].volume += vol
    byDay[day].pnl += pnl
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      volume: Math.round(d.volume),
      pnl: Math.round(d.pnl),
    }))
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}
