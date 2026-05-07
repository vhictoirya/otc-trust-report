import type { Transaction, ChainActivity, PillarScore } from "../types"
import { differenceInMonths, differenceInDays, parseISO } from "date-fns"

export function scoreIdentity(
  transactions: Transaction[],
  activeChains: ChainActivity[]
): PillarScore {
  const signals: PillarScore["signals"] = []
  let score = 0

  const dates = transactions
    .filter((t) => t.blockSignedAt)
    .map((t) => {
      try { return parseISO(t.blockSignedAt) } catch { return null }
    })
    .filter(Boolean) as Date[]

  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const earliest = sortedDates[0]
  const latest = sortedDates[sortedDates.length - 1]
  const now = new Date()

  // Wallet age (0–8)
  const walletAgeMonths = earliest ? differenceInMonths(now, earliest) : 0
  let agePts = 0
  if (walletAgeMonths >= 24) agePts = 8
  else if (walletAgeMonths >= 12) agePts = 5
  else if (walletAgeMonths >= 6) agePts = 3
  else if (walletAgeMonths >= 3) agePts = 1
  score += agePts
  signals.push({
    label: "Wallet Age",
    value: walletAgeMonths > 0 ? `${walletAgeMonths} months` : "< 1 month",
    impact: agePts >= 5 ? "positive" : agePts >= 2 ? "neutral" : "negative",
  })

  // Multi-chain breadth (0–6)
  const chainCount = activeChains.length
  let chainPts = 0
  if (chainCount >= 5) chainPts = 6
  else if (chainCount >= 3) chainPts = 4
  else if (chainCount >= 1) chainPts = 2
  score += chainPts
  signals.push({
    label: "Active Chains",
    value: `${chainCount} chain${chainCount !== 1 ? "s" : ""}`,
    impact: chainPts >= 4 ? "positive" : chainPts >= 2 ? "neutral" : "negative",
  })

  // Activity consistency — no 6-month gap (0–3)
  let hasLongGap = false
  for (let i = 1; i < sortedDates.length; i++) {
    if (differenceInMonths(sortedDates[i], sortedDates[i - 1]) >= 6) {
      hasLongGap = true
      break
    }
  }
  const consistencyPts = dates.length > 10 && !hasLongGap ? 3 : dates.length > 0 && !hasLongGap ? 2 : 0
  score += consistencyPts
  signals.push({
    label: "Activity Consistency",
    value: hasLongGap ? "Gap detected (6+ months)" : dates.length > 0 ? "Consistent" : "No data",
    impact: consistencyPts >= 2 ? "positive" : "negative",
  })

  // Dormancy detection — suddenly active after long sleep (0–3, or penalty)
  const daysSinceLatest = latest ? differenceInDays(now, latest) : 999
  const dormancyGapMonths = earliest && latest
    ? Math.max(0, differenceInMonths(latest, earliest) - walletAgeMonths + differenceInMonths(now, latest))
    : 0

  let dormancyPts = 3
  let dormancyLabel = "Normal activity pattern"
  let dormancyImpact: "positive" | "neutral" | "negative" = "positive"

  // Flag: dormant 6+ months, suddenly active in last 30 days
  if (walletAgeMonths >= 6 && hasLongGap && daysSinceLatest <= 30) {
    dormancyPts = -3
    dormancyLabel = "Dormant wallet, suddenly active"
    dormancyImpact = "negative"
  } else if (dates.length === 0) {
    dormancyPts = 0
    dormancyLabel = "No activity data"
    dormancyImpact = "neutral"
  } else if (daysSinceLatest > 180) {
    dormancyPts = 1
    dormancyLabel = `Inactive for ${Math.round(daysSinceLatest / 30)} months`
    dormancyImpact = "neutral"
  }

  score += dormancyPts
  signals.push({
    label: "Dormancy Check",
    value: dormancyLabel,
    impact: dormancyImpact,
  })

  return { score: Math.max(0, Math.min(score, 20)), maxScore: 20, signals }
}
