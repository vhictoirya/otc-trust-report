import type { TokenBalance, PillarScore } from "../types"
import { BLUE_CHIP_SYMBOLS } from "../goldrush/client"

export function scoreFinancial(balances: TokenBalance[]): PillarScore {
  const signals: PillarScore["signals"] = []
  let score = 0

  const nonSpam = balances.filter((b) => !b.isSpam)
  const totalUsd = nonSpam.reduce((sum, b) => sum + (b.quote ?? 0), 0)
  const spamCount = balances.filter((b) => b.isSpam).length
  const totalCount = balances.length

  // Portfolio value
  let valuePts = 0
  if (totalUsd >= 1_000_000) valuePts = 10
  else if (totalUsd >= 100_000) valuePts = 7
  else if (totalUsd >= 10_000) valuePts = 4
  else if (totalUsd >= 1_000) valuePts = 2
  else if (totalUsd > 0) valuePts = 1
  score += valuePts
  signals.push({
    label: "Total Portfolio",
    value: formatUsd(totalUsd),
    impact: valuePts >= 7 ? "positive" : valuePts >= 3 ? "neutral" : "negative",
  })

  // Blue chip ratio
  const blueChipUsd = nonSpam
    .filter((b) => BLUE_CHIP_SYMBOLS.has(b.symbol.toUpperCase()))
    .reduce((sum, b) => sum + (b.quote ?? 0), 0)
  const blueChipRatio = totalUsd > 0 ? blueChipUsd / totalUsd : 0
  let bcPts = 0
  if (blueChipRatio >= 0.7) bcPts = 10
  else if (blueChipRatio >= 0.5) bcPts = 7
  else if (blueChipRatio >= 0.3) bcPts = 4
  else if (blueChipRatio >= 0.1) bcPts = 2
  score += bcPts
  signals.push({
    label: "Blue Chip Ratio",
    value: `${(blueChipRatio * 100).toFixed(0)}%`,
    impact: bcPts >= 7 ? "positive" : bcPts >= 3 ? "neutral" : "negative",
  })

  // Asset diversity
  const uniqueTokens = new Set(nonSpam.map((b) => b.symbol)).size
  const diversityPts = uniqueTokens >= 10 ? 3 : uniqueTokens >= 5 ? 2 : uniqueTokens >= 2 ? 1 : 0
  score += diversityPts
  signals.push({
    label: "Asset Diversity",
    value: `${uniqueTokens} unique tokens`,
    impact: diversityPts >= 2 ? "positive" : "neutral",
  })

  // Spam penalty
  const spamRatio = totalCount > 0 ? spamCount / totalCount : 0
  let spamPenalty = 0
  if (spamRatio >= 0.5) spamPenalty = -5
  else if (spamRatio >= 0.3) spamPenalty = -3
  else if (spamRatio >= 0.1) spamPenalty = -1
  score += spamPenalty
  if (spamCount > 0) {
    signals.push({
      label: "Spam Tokens",
      value: `${spamCount} detected`,
      impact: spamPenalty < -2 ? "negative" : "neutral",
    })
  }

  return { score: Math.max(0, Math.min(score, 25)), maxScore: 25, signals }
}

export function getPortfolioComposition(balances: TokenBalance[]) {
  const nonSpam = balances.filter((b) => !b.isSpam && b.quote > 0)
  const totalUsd = nonSpam.reduce((sum, b) => sum + b.quote, 0)
  if (totalUsd === 0) return []

  const blueChipUsd = nonSpam
    .filter((b) => BLUE_CHIP_SYMBOLS.has(b.symbol.toUpperCase()))
    .reduce((sum, b) => sum + b.quote, 0)

  const stableSymbols = new Set(["USDC", "USDT", "DAI", "BUSD", "FRAX", "LUSD"])
  const stableUsd = nonSpam
    .filter((b) => stableSymbols.has(b.symbol.toUpperCase()))
    .reduce((sum, b) => sum + b.quote, 0)

  const defiUsd = totalUsd - blueChipUsd
  const spamUsd = balances.filter((b) => b.isSpam).reduce((sum, b) => sum + b.quote, 0)

  return [
    { name: "Blue Chip", value: Math.round(blueChipUsd - stableUsd), color: "#6366f1" },
    { name: "Stablecoins", value: Math.round(stableUsd), color: "#22c55e" },
    { name: "DeFi / Other", value: Math.round(defiUsd), color: "#f59e0b" },
    { name: "Spam", value: Math.round(spamUsd), color: "#ef4444" },
  ].filter((d) => d.value > 0)
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}
