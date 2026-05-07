import type { Approval, TokenBalance, Transaction, PillarScore } from "../types"
import { MIXER_CONTRACTS, OFAC_SANCTIONED_ADDRESSES, SOLANA_RISKY_PROGRAMS } from "./signals"
import { analyzeSolana } from "./solana"

export function scoreSecurity(
  approvals: Approval[],
  balances: TokenBalance[],
  transactions: Transaction[],
  isSolana = false
): PillarScore {
  if (isSolana) return scoreSolana(transactions, balances)

  const signals: PillarScore["signals"] = []
  let score = 20

  const totalPortfolioUsd = balances
    .filter((b) => !b.isSpam)
    .reduce((sum, b) => sum + (b.quote ?? 0), 0)

  const totalAtRisk = approvals.reduce((sum, a) => sum + (a.valueAtRiskQuote ?? 0), 0)
  const atRiskRatio = totalPortfolioUsd > 0 ? totalAtRisk / totalPortfolioUsd : 0

  // Value at risk relative to portfolio (0 to –10)
  let atRiskPenalty = 0
  if (atRiskRatio >= 0.9) atRiskPenalty = -10
  else if (atRiskRatio >= 0.5) atRiskPenalty = -7
  else if (atRiskRatio >= 0.2) atRiskPenalty = -4
  else if (atRiskRatio >= 0.05) atRiskPenalty = -2
  score += atRiskPenalty
  signals.push({
    label: "Value at Risk",
    value: `$${Math.round(totalAtRisk).toLocaleString()} (${(atRiskRatio * 100).toFixed(0)}%)`,
    impact: atRiskPenalty <= -7 ? "negative" : atRiskPenalty <= -2 ? "neutral" : "positive",
  })

  // Open approval count (0 to –5)
  const totalSpenders = approvals.reduce((sum, a) => sum + a.spenders.length, 0)
  let approvalPenalty = 0
  if (totalSpenders >= 50) approvalPenalty = -5
  else if (totalSpenders >= 20) approvalPenalty = -3
  else if (totalSpenders >= 10) approvalPenalty = -1
  score += approvalPenalty
  signals.push({
    label: "Open Approvals",
    value: `${totalSpenders} active`,
    impact: approvalPenalty <= -3 ? "negative" : approvalPenalty < 0 ? "neutral" : "positive",
  })

  // High-risk spender flag
  const highRiskCount = approvals
    .flatMap((a) => a.spenders)
    .filter((s) => s.riskFactor === "HIGH" || s.riskFactor === "CRITICAL").length
  if (highRiskCount > 0) {
    score -= Math.min(highRiskCount * 2, 5)
    signals.push({
      label: "High-Risk Spenders",
      value: `${highRiskCount} flagged`,
      impact: "negative",
    })
  } else {
    signals.push({
      label: "High-Risk Spenders",
      value: "None detected",
      impact: "positive",
    })
  }

  // OFAC sanctioned address exposure — hard penalty –15 (takes priority over mixer)
  const ofacHits = transactions.filter((t) =>
    OFAC_SANCTIONED_ADDRESSES.has(t.toAddress.toLowerCase()) ||
    OFAC_SANCTIONED_ADDRESSES.has(t.fromAddress.toLowerCase())
  )
  if (ofacHits.length > 0) {
    score -= 15
    signals.push({
      label: "OFAC Sanctioned Exposure",
      value: `${ofacHits.length} interaction${ofacHits.length > 1 ? "s" : ""} with SDN-listed address`,
      impact: "negative",
    })
  } else {
    signals.push({
      label: "OFAC / Sanctions",
      value: "No SDN-listed address interactions detected",
      impact: "positive",
    })
  }

  // Mixer contract interaction — hard penalty –10
  const mixerHits = transactions.filter((t) =>
    MIXER_CONTRACTS.has(t.toAddress.toLowerCase()) ||
    MIXER_CONTRACTS.has(t.fromAddress.toLowerCase())
  )
  if (mixerHits.length > 0) {
    score -= 10
    signals.push({
      label: "Mixer Exposure",
      value: `${mixerHits.length} interaction${mixerHits.length > 1 ? "s" : ""} detected`,
      impact: "negative",
    })
  } else {
    signals.push({
      label: "Mixer / Tumbler",
      value: "None detected",
      impact: "positive",
    })
  }

  return { score: Math.max(0, Math.min(score, 20)), maxScore: 20, signals }
}

function scoreSolana(transactions: Transaction[], balances: TokenBalance[]): PillarScore {
  const signals: PillarScore["signals"] = []
  let score = 14  // starts below max — protocols + staking bring it up to 20

  const p = analyzeSolana(transactions, balances)
  const successful = transactions.filter((t) => t.successful)
  const failRate = transactions.length > 0
    ? (transactions.length - successful.length) / transactions.length : 0

  // 1. Privacy / risky program exposure — hard penalty –10
  //    Three-layer detection: toAddress, fromAddress, and log event senderAddress
  const riskyByAddr = transactions.filter(
    (t) =>
      SOLANA_RISKY_PROGRAMS.has(t.toAddress) ||
      SOLANA_RISKY_PROGRAMS.has(t.fromAddress) ||
      t.logEvents.some((e) => SOLANA_RISKY_PROGRAMS.has(e.senderAddress))
  )
  if (riskyByAddr.length > 0) {
    score -= 10
    signals.push({
      label: "Privacy Protocol Exposure",
      value: `${riskyByAddr.length} interaction${riskyByAddr.length > 1 ? "s" : ""} detected`,
      impact: "negative",
    })
  } else {
    signals.push({
      label: "Privacy Protocol Exposure",
      value: "None detected",
      impact: "positive",
    })
  }

  // 2. Reputable Solana protocol usage (up to +4)
  const protocolCount = p.uniqueDefiProtocols.size
  let reputablePts = 0
  if (protocolCount >= 8) reputablePts = 4
  else if (protocolCount >= 5) reputablePts = 3
  else if (protocolCount >= 3) reputablePts = 2
  else if (protocolCount >= 1) reputablePts = 1
  score += reputablePts
  signals.push({
    label: "Reputable Protocol Usage",
    value: protocolCount > 0
      ? `${protocolCount} protocol${protocolCount > 1 ? "s" : ""} (${[...p.uniqueDefiProtocols].filter((n) => n.length < 20).slice(0, 3).join(", ")})`
      : "No known protocols detected",
    impact: reputablePts >= 3 ? "positive" : reputablePts >= 1 ? "neutral" : "negative",
  })

  // 3. Liquid staking — balance-based, most tamper-resistant credibility signal (up to +3)
  let stakingPts = 0
  if (p.liquidStakingUsd >= 10_000) stakingPts = 3
  else if (p.liquidStakingUsd > 0)  stakingPts = 1
  score += stakingPts
  signals.push({
    label: "Liquid Staking Held",
    value: p.liquidStakingUsd > 0
      ? `$${Math.round(p.liquidStakingUsd).toLocaleString()} (${p.liquidStakingSymbols.join(", ")})`
      : "None held",
    impact: stakingPts >= 3 ? "positive" : stakingPts >= 1 ? "neutral" : "neutral",
  })

  // 4. Open Solana token delegates — if GoldRush approvals returned data via EVM path
  //    (this function is only called when approvals are empty, so no data to show here)
  signals.push({
    label: "Token Delegates",
    value: "SPL approve model — no unlimited approvals",
    impact: "positive",
  })

  // 5. Transaction failure rate
  let failPenalty = 0
  if (failRate >= 0.3) failPenalty = -5
  else if (failRate >= 0.15) failPenalty = -3
  else if (failRate >= 0.05) failPenalty = -1
  score += failPenalty
  signals.push({
    label: "Transaction Failure Rate",
    value: failRate > 0 ? `${(failRate * 100).toFixed(1)}%` : "0%",
    impact: failPenalty < -2 ? "negative" : failPenalty < 0 ? "neutral" : "positive",
  })

  return { score: Math.max(0, Math.min(score, 20)), maxScore: 20, signals }
}

export function getValueAtRiskData(
  approvals: Approval[],
  balances: TokenBalance[]
): { label: string; value: number; color: string }[] {
  const totalPortfolioUsd = balances
    .filter((b) => !b.isSpam)
    .reduce((sum, b) => sum + (b.quote ?? 0), 0)
  const totalAtRisk = approvals.reduce((sum, a) => sum + (a.valueAtRiskQuote ?? 0), 0)
  const safe = Math.max(0, totalPortfolioUsd - totalAtRisk)

  return [
    { label: "Safe", value: Math.round(safe), color: "#22c55e" },
    { label: "At Risk", value: Math.round(totalAtRisk), color: "#ef4444" },
  ]
}

export function hasMixerExposure(transactions: Transaction[]): boolean {
  return transactions.some(
    (t) =>
      MIXER_CONTRACTS.has(t.toAddress.toLowerCase()) ||
      MIXER_CONTRACTS.has(t.fromAddress.toLowerCase())
  )
}

export function hasSanctionedExposure(transactions: Transaction[]): boolean {
  return transactions.some(
    (t) =>
      OFAC_SANCTIONED_ADDRESSES.has(t.toAddress.toLowerCase()) ||
      OFAC_SANCTIONED_ADDRESSES.has(t.fromAddress.toLowerCase())
  )
}

export function hasSolanaRiskyExposure(transactions: Transaction[]): boolean {
  return transactions.some(
    (t) =>
      SOLANA_RISKY_PROGRAMS.has(t.toAddress) ||
      SOLANA_RISKY_PROGRAMS.has(t.fromAddress)
  )
}
