import type { RawWalletData, TrustReport, Flag } from "../types"
import { scoreIdentity } from "./identity"
import { scoreFinancial, getPortfolioComposition } from "./financial"
import { scoreTrackRecord, getActivityHeatmap, getPnLCurve, getMedianTxSize } from "./trackRecord"
import { scoreSecurity, getValueAtRiskData, hasMixerExposure, hasSolanaRiskyExposure, hasSanctionedExposure } from "./security"
import { getHyperliquidChartData } from "./hyperliquid"
import { buildSolanaBreakdown } from "./solana"
import { differenceInMonths, parseISO } from "date-fns"

export function buildTrustReport(wallet: string, data: RawWalletData): TrustReport {
  const isSolana = !wallet.startsWith("0x")

  // ERC20 token price enrichment — valueQuote is 0 for token transfers; parse Transfer log events
  const tokenPriceMap = new Map<string, number>()
  for (const b of data.balances) {
    if (b.contractAddress && b.quoteRate > 0) {
      tokenPriceMap.set(b.contractAddress.toLowerCase(), b.quoteRate)
    }
  }
  for (const tx of data.transactions) {
    if (isSolana) {
      // Solana: sum token balance changes for known-price mints (mint address = contractAddress in balances)
      let tokenValueUsd = tx.valueQuote ?? 0
      for (const { mint, uiAmountChange } of tx.solanaTokenChanges ?? []) {
        const price = tokenPriceMap.get(mint.toLowerCase())
        if (price && price > 0) tokenValueUsd += uiAmountChange * price
      }
      tx.estimatedTransferUsd = tokenValueUsd
    } else {
      // EVM: parse ERC20 Transfer log events (valueQuote is 0 for token txs)
      let tokenValueUsd = 0
      for (const event of tx.logEvents) {
        if (event.decoded?.name === "Transfer") {
          const rawValue = event.decoded.params.find(
            (p) => p.name === "value" || p.name === "_value"
          )?.value
          const price = tokenPriceMap.get(event.senderAddress.toLowerCase())
          if (rawValue && price && price > 0) {
            const decimals = event.senderContractDecimals ?? 18
            const tokenAmount = parseFloat(rawValue) / Math.pow(10, decimals)
            if (isFinite(tokenAmount) && tokenAmount > 0) tokenValueUsd += tokenAmount * price
          }
        }
      }
      tx.estimatedTransferUsd = (tx.valueQuote ?? 0) + tokenValueUsd
    }
  }

  const identity = scoreIdentity(data.transactions, data.activeChains)
  const financial = scoreFinancial(data.balances)
  const trackRecord = scoreTrackRecord(data.transactions, data.balances, isSolana)
  const security = scoreSecurity(data.approvals, data.balances, data.transactions, isSolana)

  // Compute wallet age from tx dates
  const txDates = data.transactions
    .filter((t) => t.blockSignedAt)
    .map((t) => { try { return parseISO(t.blockSignedAt) } catch { return null } })
    .filter(Boolean) as Date[]
  const earliest = txDates.length > 0 ? new Date(Math.min(...txDates.map((d) => d.getTime()))) : null
  const walletAgeMonths = earliest ? differenceInMonths(new Date(), earliest) : 0

  const totalPortfolioUsd = data.balances
    .filter((b) => !b.isSpam)
    .reduce((sum, b) => sum + (b.quote ?? 0), 0)

  // Volume includes ERC20 token transfer values via estimatedTransferUsd
  const totalVolumeUsd = data.transactions
    .filter((t) => t.successful)
    .reduce((sum, t) => sum + (t.estimatedTransferUsd ?? t.valueQuote ?? 0), 0)

  const overallScore = identity.score + financial.score + trackRecord.score + security.score
  const riskLevel = getRiskLevel(overallScore)
  const flags = buildFlags(data, overallScore, isSolana, walletAgeMonths, totalPortfolioUsd)

  const totalAtRisk = data.approvals.reduce((sum, a) => sum + (a.valueAtRiskQuote ?? 0), 0)

  const hlVolume = data.hyperliquidFills.reduce(
    (sum, f) => sum + parseFloat(f.sz) * parseFloat(f.px), 0
  )

  const blueChipSymbols = new Set(["ETH", "WETH", "BTC", "WBTC", "SOL", "WSOL", "USDC", "USDT", "DAI"])
  const blueChipUsd = data.balances
    .filter((b) => !b.isSpam && blueChipSymbols.has(b.symbol.toUpperCase()))
    .reduce((sum, b) => sum + (b.quote ?? 0), 0)
  const blueChipRatio = totalPortfolioUsd > 0 ? blueChipUsd / totalPortfolioUsd : 0

  return {
    wallet,
    generatedAt: new Date().toISOString(),
    overallScore,
    riskLevel,
    pillars: { identity, financial, trackRecord, security },
    flags,
    summary: {
      totalPortfolioUsd,
      activeChains: data.activeChains.length,
      totalTransactions: data.transactions.length,
      walletAgeMonths,
      totalVolumeUsd,
      valueAtRiskUsd: totalAtRisk,
      hyperliquidVolume: hlVolume,
      blueChipRatio,
    },
    chartData: {
      portfolioComposition: getPortfolioComposition(data.balances),
      activityHeatmap: getActivityHeatmap(data.transactions),
      pnlCurve: getPnLCurve(data.transactions),
      chainActivity: Array.from(
        new Map(data.activeChains.map((c) => [c.chainName, c])).values()
      ).map((c) => ({
        chain: c.chainName,
        firstSeen: "",
        lastSeen: c.lastSeen,
        active: c.isActive,
      })),
      hyperliquidVolume: getHyperliquidChartData(data.hyperliquidFills),
      valueAtRisk: getValueAtRiskData(data.approvals, data.balances),
      solanaBreakdown: isSolana
        ? buildSolanaBreakdown(data.transactions, data.balances)
        : undefined,
    },
  }
}

function getRiskLevel(score: number): TrustReport["riskLevel"] {
  if (score >= 80) return "TRUSTED"
  if (score >= 65) return "LOW"
  if (score >= 45) return "MEDIUM"
  if (score >= 25) return "HIGH"
  return "CRITICAL"
}

function buildFlags(
  data: RawWalletData,
  score: number,
  isSolana = false,
  walletAgeMonths = 0,
  totalPortfolioUsd = 0
): Flag[] {
  const flags: Flag[] = []

  if (score >= 75) {
    flags.push({ type: "positive", message: "Strong on-chain history with consistent activity" })
  }

  // Large transfers — uses estimatedTransferUsd so ERC20 transfers are counted
  const largeTxCount = data.transactions.filter(
    (t) => t.successful && (t.estimatedTransferUsd ?? t.valueQuote ?? 0) >= 50_000
  ).length
  if (largeTxCount >= 5) {
    flags.push({
      type: "positive",
      message: `${largeTxCount} verified large transfers ($50k+) — strong OTC track record`,
    })
  }

  const totalAtRisk = data.approvals.reduce((sum, a) => sum + (a.valueAtRiskQuote ?? 0), 0)
  const totalPortfolio = data.balances.filter((b) => !b.isSpam).reduce((sum, b) => sum + b.quote, 0)
  if (totalAtRisk > 0 && totalPortfolio > 0) {
    const ratio = totalAtRisk / totalPortfolio
    if (ratio >= 0.5) {
      flags.push({
        type: "warning",
        message: `${(ratio * 100).toFixed(0)}% of portfolio value exposed via open token approvals`,
      })
    }
  }

  if (data.activeChains.length >= 5) {
    flags.push({
      type: "positive",
      message: `Active across ${data.activeChains.length} blockchain networks`,
    })
  }

  if (data.hyperliquidFills.length > 0) {
    const hlVolume = data.hyperliquidFills.reduce(
      (sum, f) => sum + parseFloat(f.sz) * parseFloat(f.px), 0
    )
    flags.push({
      type: "info",
      message: `$${(hlVolume / 1_000_000).toFixed(2)}M Hyperliquid perp volume (90 days)`,
    })
  }

  if (data.hyperliquidState?.liquidated) {
    flags.push({ type: "warning", message: "Hyperliquid account has been liquidated" })
  }

  // OFAC SDN-list exposure — highest severity
  if (!isSolana && hasSanctionedExposure(data.transactions)) {
    flags.push({
      type: "critical",
      message: "Transactions with OFAC SDN-listed addresses detected — compliance risk",
    })
  }

  // Mixer / privacy protocol exposure
  const hasPrivacyExposure = isSolana
    ? hasSolanaRiskyExposure(data.transactions)
    : hasMixerExposure(data.transactions)
  if (hasPrivacyExposure) {
    flags.push({
      type: "critical",
      message: isSolana
        ? "Interaction with known Solana privacy protocol detected"
        : "Direct interaction with known mixer/tumbler contracts detected",
    })
  }

  // Sample size warning — score is based on a capped sample, not full history
  const txLimit = isSolana ? 200 : 100
  if (data.transactions.length >= Math.floor(txLimit * 0.95)) {
    flags.push({
      type: "warning",
      message: `Score based on ${data.transactions.length} sampled transactions — full wallet history may differ`,
    })
  }

  // Wallet age vs portfolio incongruence — new wallet holding significant value
  if (walletAgeMonths < 3 && totalPortfolioUsd >= 50_000) {
    flags.push({
      type: "warning",
      message: `New wallet (<3 months) holding $${(totalPortfolioUsd / 1000).toFixed(0)}K — verify source of funds`,
    })
  }

  // Concentrated incoming source — >80% of received txs from one address
  const successful = data.transactions.filter((t) => t.successful)
  const fromCounts = new Map<string, number>()
  for (const tx of successful) {
    const a = tx.fromAddress?.toLowerCase()
    if (a) fromCounts.set(a, (fromCounts.get(a) ?? 0) + 1)
  }
  let walletAddr = ""; let maxFromCount = 0
  for (const [addr, count] of fromCounts) {
    if (count > maxFromCount) { maxFromCount = count; walletAddr = addr }
  }
  const incomingByAddress = new Map<string, number>()
  for (const tx of successful) {
    if (tx.fromAddress?.toLowerCase() !== walletAddr && tx.fromAddress) {
      const from = tx.fromAddress.toLowerCase()
      incomingByAddress.set(from, (incomingByAddress.get(from) ?? 0) + 1)
    }
  }
  const totalIncoming = [...incomingByAddress.values()].reduce((s, v) => s + v, 0)
  const topIncomingCount = incomingByAddress.size > 0 ? Math.max(...incomingByAddress.values()) : 0
  if (totalIncoming >= 5 && topIncomingCount / totalIncoming >= 0.8) {
    flags.push({
      type: "warning",
      message: `${Math.round((topIncomingCount / totalIncoming) * 100)}% of incoming transactions from a single address — concentrated funding source`,
    })
  }

  // Deal-size congruence — informational
  const medianTxSize = getMedianTxSize(data.transactions)
  if (medianTxSize > 0) {
    flags.push({
      type: "info",
      message: `Median historical tx size: $${medianTxSize >= 1000 ? (medianTxSize / 1000).toFixed(1) + "K" : medianTxSize.toFixed(0)} — compare to proposed OTC amount`,
    })
  }

  const failedTxs = data.transactions.filter((t) => !t.successful).length
  const failRate = data.transactions.length > 0 ? failedTxs / data.transactions.length : 0
  if (failRate >= 0.2) {
    flags.push({
      type: "warning",
      message: `High failed transaction rate: ${(failRate * 100).toFixed(0)}% of transactions failed`,
    })
  }

  return flags
}
