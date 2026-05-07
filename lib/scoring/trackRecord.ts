import type { Transaction, TokenBalance, PillarScore } from "../types"
import { format, parseISO, subDays } from "date-fns"
import { REPUTABLE_PROTOCOLS, SOLANA_REPUTABLE_PROGRAMS } from "./signals"
import { analyzeSolana } from "./solana"

export function scoreTrackRecord(
  transactions: Transaction[],
  balances: TokenBalance[] = [],
  isSolana = false
): PillarScore {
  if (isSolana) return scoreTrackRecordSolana(transactions, balances)

  const signals: PillarScore["signals"] = []
  let score = 0

  const successful = transactions.filter((t) => t.successful)
  const failed = transactions.filter((t) => !t.successful)
  const failRate = transactions.length > 0 ? failed.length / transactions.length : 0

  // 1. Transaction count (0–8)
  let txPts = 0
  if (successful.length >= 1000) txPts = 8
  else if (successful.length >= 500) txPts = 6
  else if (successful.length >= 100) txPts = 4
  else if (successful.length >= 25) txPts = 2
  else if (successful.length >= 5) txPts = 1
  score += txPts
  signals.push({
    label: "Successful Transactions",
    value: successful.length.toLocaleString(),
    impact: txPts >= 5 ? "positive" : txPts >= 2 ? "neutral" : "negative",
  })

  // 2. Large transfers $10k+ — uses estimatedTransferUsd (includes ERC20 token values)
  const largeTxCount = successful.filter((t) => (t.estimatedTransferUsd ?? t.valueQuote ?? 0) >= 10_000).length
  let largePts = 0
  if (largeTxCount >= 20) largePts = 10
  else if (largeTxCount >= 10) largePts = 7
  else if (largeTxCount >= 5) largePts = 5
  else if (largeTxCount >= 1) largePts = 3
  score += largePts
  signals.push({
    label: "Large Transfers ($10k+)",
    value: `${largeTxCount} transfers (incl. ERC20)`,
    impact: largePts >= 5 ? "positive" : largePts >= 2 ? "neutral" : "negative",
  })

  // 3. Counterparty network — outgoing + incoming, both directions (0–8)
  const fromCounts = new Map<string, number>()
  for (const tx of successful) {
    const a = tx.fromAddress?.toLowerCase()
    if (a) fromCounts.set(a, (fromCounts.get(a) ?? 0) + 1)
  }
  let walletAddr = ""
  let maxFromCount = 0
  for (const [addr, count] of fromCounts) {
    if (count > maxFromCount) { maxFromCount = count; walletAddr = addr }
  }
  const outgoingRecipients = new Set(
    successful.filter((t) => t.fromAddress?.toLowerCase() === walletAddr)
      .map((t) => t.toAddress?.toLowerCase()).filter(Boolean)
  )
  const incomingSenders = new Set(
    successful.filter((t) => t.fromAddress?.toLowerCase() !== walletAddr && t.fromAddress)
      .map((t) => t.fromAddress.toLowerCase())
  )
  const totalUniqueCounterparties = new Set([...outgoingRecipients, ...incomingSenders]).size
  let counterpartyPts = 0
  if (totalUniqueCounterparties >= 100) counterpartyPts = 8
  else if (totalUniqueCounterparties >= 50) counterpartyPts = 6
  else if (totalUniqueCounterparties >= 15) counterpartyPts = 4
  else if (totalUniqueCounterparties >= 5) counterpartyPts = 2
  score += counterpartyPts
  signals.push({
    label: "Counterparty Network",
    value: `${totalUniqueCounterparties} unique (↑${outgoingRecipients.size} sent · ↓${incomingSenders.size} received)`,
    impact: counterpartyPts >= 5 ? "positive" : counterpartyPts >= 2 ? "neutral" : "negative",
  })

  // 4. DeFi protocol diversity (0–4) — EVM only (Solana goes through scoreTrackRecordSolana)
  const uniqueContracts = new Set(
    successful.filter((t) => t.logEvents.length > 0).map((t) => t.toAddress)
  ).size
  const defiPts = uniqueContracts >= 20 ? 4 : uniqueContracts >= 10 ? 3 : uniqueContracts >= 3 ? 2 : uniqueContracts >= 1 ? 1 : 0
  score += defiPts
  signals.push({
    label: "Protocol Interactions",
    value: `${uniqueContracts} unique contracts`,
    impact: defiPts >= 3 ? "positive" : defiPts >= 1 ? "neutral" : "negative",
  })

  // 5. Velocity spike detection (0–5) — NEW
  // Compare last-7-day tx count vs. 90-day daily average
  const cutoff7d = subDays(new Date(), 7).getTime()
  const cutoff90d = subDays(new Date(), 90).getTime()
  const txLast7d = successful.filter((t) => {
    try { return parseISO(t.blockSignedAt).getTime() >= cutoff7d } catch { return false }
  }).length
  const txLast90d = successful.filter((t) => {
    try { return parseISO(t.blockSignedAt).getTime() >= cutoff90d } catch { return false }
  }).length
  const dailyAvg90d = txLast90d / 90
  const dailyAvg7d = txLast7d / 7

  let velocityPts = 5
  let velocityLabel = "Normal activity level"
  let velocityImpact: "positive" | "neutral" | "negative" = "positive"

  if (dailyAvg90d > 0 && dailyAvg7d > dailyAvg90d * 10) {
    // 10x spike — strong red flag before a deal
    velocityPts = -3
    velocityLabel = `Spike: ${txLast7d} tx in 7d vs ${txLast90d} in 90d`
    velocityImpact = "negative"
  } else if (dailyAvg90d > 0 && dailyAvg7d > dailyAvg90d * 4) {
    velocityPts = 1
    velocityLabel = `Elevated: ${txLast7d} tx in last 7 days`
    velocityImpact = "neutral"
  } else if (txLast90d === 0) {
    velocityPts = 0
    velocityLabel = "No recent activity"
    velocityImpact = "neutral"
  }
  score += velocityPts
  signals.push({
    label: "Activity Velocity",
    value: velocityLabel,
    impact: velocityImpact,
  })

  // 6. Deal-size congruence — informational signal (no direct pts, flag only)
  const txValues = successful
    .map((t) => t.estimatedTransferUsd ?? t.valueQuote ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b)
  const medianTxSize =
    txValues.length > 0 ? txValues[Math.floor(txValues.length / 2)] : 0
  if (medianTxSize > 0) {
    signals.push({
      label: "Median Tx Size",
      value: formatUsd(medianTxSize),
      impact: "neutral",
    })
  }

  // Penalty: failed tx rate
  let failPenalty = 0
  if (failRate >= 0.3) failPenalty = -5
  else if (failRate >= 0.15) failPenalty = -3
  else if (failRate >= 0.05) failPenalty = -1
  score += failPenalty
  if (failRate > 0) {
    signals.push({
      label: "Failed Transaction Rate",
      value: `${(failRate * 100).toFixed(1)}%`,
      impact: failPenalty < -2 ? "negative" : failPenalty < 0 ? "neutral" : "positive",
    })
  }

  return { score: Math.max(0, Math.min(score, 35)), maxScore: 35, signals }
}

export function getActivityHeatmap(transactions: Transaction[]): { date: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const tx of transactions) {
    if (!tx.blockSignedAt) continue
    try {
      const day = format(parseISO(tx.blockSignedAt), "yyyy-MM-dd")
      counts[day] = (counts[day] ?? 0) + 1
    } catch { /* skip */ }
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

export function getPnLCurve(transactions: Transaction[]): { date: string; pnl: number; cumulative: number }[] {
  const sorted = [...transactions]
    .filter((t) => t.successful && t.blockSignedAt)
    .sort((a, b) => new Date(a.blockSignedAt).getTime() - new Date(b.blockSignedAt).getTime())

  const byDay: Record<string, number> = {}
  for (const tx of sorted) {
    try {
      const day = format(parseISO(tx.blockSignedAt), "yyyy-MM-dd")
      byDay[day] = (byDay[day] ?? 0) + 1
    } catch { /* skip */ }
  }

  let cumulative = 0
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => {
      cumulative += count
      return { date, pnl: count, cumulative }
    })
}

export function getMedianTxSize(transactions: Transaction[]): number {
  const values = transactions
    .filter((t) => t.successful)
    .map((t) => t.estimatedTransferUsd ?? t.valueQuote ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b)
  return values.length > 0 ? values[Math.floor(values.length / 2)] : 0
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function scoreTrackRecordSolana(
  transactions: Transaction[],
  balances: TokenBalance[]
): PillarScore {
  const signals: PillarScore["signals"] = []
  let score = 0
  const p = analyzeSolana(transactions, balances)

  const successful = transactions.filter((t) => t.successful)
  const failRate = transactions.length > 0
    ? (transactions.length - successful.length) / transactions.length : 0

  // 1. Transaction count (0–8) — same as EVM
  let txPts = 0
  if (successful.length >= 1000) txPts = 8
  else if (successful.length >= 500) txPts = 6
  else if (successful.length >= 100) txPts = 4
  else if (successful.length >= 25)  txPts = 2
  else if (successful.length >= 5)   txPts = 1
  score += txPts
  signals.push({
    label: "Successful Transactions",
    value: successful.length.toLocaleString(),
    impact: txPts >= 5 ? "positive" : txPts >= 2 ? "neutral" : "negative",
  })

  // 2. Large native SOL transfers ≥ $10k (0–10)
  // valueQuote is populated for native SOL, so this works accurately
  let largePts = 0
  if (p.largeSolTxCount >= 20) largePts = 10
  else if (p.largeSolTxCount >= 10) largePts = 7
  else if (p.largeSolTxCount >= 5)  largePts = 5
  else if (p.largeSolTxCount >= 1)  largePts = 3
  score += largePts
  signals.push({
    label: "Large SOL Transfers ($10k+)",
    value: `${p.largeSolTxCount} transfers`,
    impact: largePts >= 5 ? "positive" : largePts >= 2 ? "neutral" : "negative",
  })

  // 3. Unique P2P counterparties — excludes program addresses (0–8)
  let counterpartyPts = 0
  if (p.uniqueP2pRecipients >= 100) counterpartyPts = 8
  else if (p.uniqueP2pRecipients >= 50)  counterpartyPts = 6
  else if (p.uniqueP2pRecipients >= 15)  counterpartyPts = 4
  else if (p.uniqueP2pRecipients >= 5)   counterpartyPts = 2
  score += counterpartyPts
  signals.push({
    label: "Unique P2P Counterparties",
    value: p.uniqueP2pRecipients.toLocaleString(),
    impact: counterpartyPts >= 5 ? "positive" : counterpartyPts >= 2 ? "neutral" : "negative",
  })

  // 4. DeFi protocol diversity — unique reputable Solana protocols used (0–4)
  const protocolCount = p.uniqueDefiProtocols.size
  const defiPts = protocolCount >= 8 ? 4 : protocolCount >= 5 ? 3 : protocolCount >= 2 ? 2 : protocolCount >= 1 ? 1 : 0
  score += defiPts
  signals.push({
    label: "Solana Protocol Diversity",
    value: protocolCount > 0
      ? `${protocolCount} protocol${protocolCount > 1 ? "s" : ""} (${[...p.uniqueDefiProtocols].filter((n) => n.length < 20).slice(0, 3).join(", ")})`
      : "No known protocols detected",
    impact: defiPts >= 3 ? "positive" : defiPts >= 1 ? "neutral" : "negative",
  })

  // 5. Transaction sophistication — swap + staking + NFT mix (0–5)
  // A counterparty who only holds shows lower on-chain sophistication than one who actively trades
  const activityTypes = [p.swaps > 0, p.staking > 0, p.nft > 0, p.defi > 0].filter(Boolean).length
  let sophisticationPts = 0
  if (activityTypes >= 4) sophisticationPts = 5
  else if (activityTypes >= 3) sophisticationPts = 4
  else if (activityTypes >= 2) sophisticationPts = 2
  else if (activityTypes >= 1) sophisticationPts = 1
  score += sophisticationPts
  const typeBreakdown = [
    p.swaps > 0     ? `${p.swaps} swaps` : null,
    p.staking > 0   ? `${p.staking} staking` : null,
    p.nft > 0       ? `${p.nft} NFT` : null,
    p.p2pTransfers > 0 ? `${p.p2pTransfers} P2P` : null,
  ].filter(Boolean)
  signals.push({
    label: "Activity Sophistication",
    value: typeBreakdown.length > 0 ? typeBreakdown.join(" · ") : "No classified activity",
    impact: sophisticationPts >= 4 ? "positive" : sophisticationPts >= 2 ? "neutral" : "negative",
  })

  // 6. Total fees paid — proxy for genuine on-chain depth (informational)
  if (p.totalFeesUsd > 0) {
    signals.push({
      label: "Total Network Fees Paid",
      value: formatUsd(p.totalFeesUsd),
      impact: "neutral",
    })
  }

  // 7. Velocity spike — same logic as EVM
  const cutoff7d  = subDays(new Date(), 7).getTime()
  const cutoff90d = subDays(new Date(), 90).getTime()
  const txLast7d  = successful.filter((t) => { try { return parseISO(t.blockSignedAt).getTime() >= cutoff7d  } catch { return false } }).length
  const txLast90d = successful.filter((t) => { try { return parseISO(t.blockSignedAt).getTime() >= cutoff90d } catch { return false } }).length
  const dailyAvg90d = txLast90d / 90
  const dailyAvg7d  = txLast7d  / 7

  let velocityPts = 5
  let velocityLabel = "Normal activity level"
  let velocityImpact: "positive" | "neutral" | "negative" = "positive"
  if (dailyAvg90d > 0 && dailyAvg7d > dailyAvg90d * 10) {
    velocityPts = -3; velocityLabel = `Spike: ${txLast7d} tx in 7d vs ${txLast90d} in 90d`; velocityImpact = "negative"
  } else if (dailyAvg90d > 0 && dailyAvg7d > dailyAvg90d * 4) {
    velocityPts = 1; velocityLabel = `Elevated: ${txLast7d} tx in last 7 days`; velocityImpact = "neutral"
  } else if (txLast90d === 0) {
    velocityPts = 0; velocityLabel = "No recent activity"; velocityImpact = "neutral"
  }
  score += velocityPts
  signals.push({ label: "Activity Velocity", value: velocityLabel, impact: velocityImpact })

  // Penalty: failed tx rate
  let failPenalty = 0
  if (failRate >= 0.3) failPenalty = -5
  else if (failRate >= 0.15) failPenalty = -3
  else if (failRate >= 0.05) failPenalty = -1
  score += failPenalty
  if (failRate > 0) {
    signals.push({
      label: "Failed Transaction Rate",
      value: `${(failRate * 100).toFixed(1)}%`,
      impact: failPenalty < -2 ? "negative" : failPenalty < 0 ? "neutral" : "positive",
    })
  }

  return { score: Math.max(0, Math.min(score, 35)), maxScore: 35, signals }
}
