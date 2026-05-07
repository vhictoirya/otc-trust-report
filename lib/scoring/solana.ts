import type { Transaction, TokenBalance, SolanaBreakdown } from "../types"
import {
  SOLANA_REPUTABLE_PROGRAMS,
  SOLANA_REPUTABLE_NAMES,
  SOLANA_PROGRAM_NAME,
  SOLANA_STAKING_SYMBOLS,
} from "./signals"

// Instruction name keyword sets
const SWAP_KW    = ["swap", "route", "exchange", "trade", "swapexact", "swapbaseout", "swapbasein"]
const STAKE_KW   = ["stake", "delegate", "deposit", "unstake", "undelegate", "deactivate", "splitstake", "mergestake", "withdrawstake", "delegatestake"]
const TRANSFER_KW = ["transfer", "transferchecked", "transferwithfee"]
const NFT_KW     = ["buy", "sell", "list", "delist", "mint", "mintto", "burn", "auction", "bid", "fulfill"]
const NFT_SENDERS = ["tensor", "magic eden", "solanart", "exchange.art", "monkelabs", "hyperspace"]

type TxType = "swap" | "transfer" | "staking" | "nft" | "defi" | "other"

function classifyTx(tx: Transaction): { type: TxType; protocols: string[] } {
  let type: TxType = "other"
  const protocols: string[] = []

  for (const ev of tx.logEvents) {
    const instrName = (ev.decoded?.name ?? "").toLowerCase()
    const senderName = (ev.senderName ?? "").toLowerCase()
    const senderAddr = ev.senderAddress ?? ""

    // Protocol detection — resolve to canonical human-readable name to avoid double-counting
    if (senderName && SOLANA_REPUTABLE_NAMES.has(senderName)) protocols.push(senderName)
    if (senderAddr && SOLANA_REPUTABLE_PROGRAMS.has(senderAddr)) {
      // Resolve address → name so Set deduplicates with the senderName entry above
      protocols.push(SOLANA_PROGRAM_NAME[senderAddr] ?? senderAddr)
    }

    // Instruction classification — highest-priority type wins
    if (SWAP_KW.some((k) => instrName.includes(k))) {
      type = "swap"
    } else if (NFT_KW.some((k) => instrName === k) || NFT_SENDERS.some((k) => senderName.includes(k))) {
      if (type !== "swap") type = "nft"
    } else if (STAKE_KW.some((k) => instrName.includes(k))) {
      if (type === "other") type = "staking"
    } else if (TRANSFER_KW.some((k) => instrName === k)) {
      if (type === "other") type = "transfer"
    }
  }

  // If we hit a reputable protocol but no specific instruction → general DeFi interaction
  if (type === "other" && protocols.length > 0) type = "defi"

  // Also check toAddress directly
  if (SOLANA_REPUTABLE_PROGRAMS.has(tx.toAddress) && type === "other") type = "defi"

  return { type, protocols }
}

export interface SolanaProfile {
  swaps: number
  p2pTransfers: number
  staking: number
  nft: number
  defi: number
  other: number
  uniqueP2pRecipients: number
  uniqueDefiProtocols: Set<string>
  totalFeesUsd: number
  nativeSolVolumeUsd: number
  largeSolTxCount: number
  liquidStakingUsd: number
  liquidStakingSymbols: string[]
}

export function analyzeSolana(
  transactions: Transaction[],
  balances: TokenBalance[]
): SolanaProfile {
  const successful = transactions.filter((t) => t.successful)

  let swaps = 0, p2pTransfers = 0, staking = 0, nft = 0, defi = 0, other = 0
  const uniqueDefiProtocols = new Set<string>()
  const p2pRecipients = new Set<string>()

  for (const tx of successful) {
    const { type, protocols } = classifyTx(tx)

    for (const p of protocols) uniqueDefiProtocols.add(p)

    switch (type) {
      case "swap":     swaps++;         break
      case "transfer": p2pTransfers++;  p2pRecipients.add(tx.toAddress); break
      case "staking":  staking++;       break
      case "nft":      nft++;           break
      case "defi":     defi++;          break
      default:         other++
    }
  }

  // Native SOL volume (valueQuote is populated for native SOL transfers)
  const nativeSolVolumeUsd = successful.reduce((s, t) => s + (t.valueQuote ?? 0), 0)
  const largeSolTxCount = successful.filter((t) => (t.valueQuote ?? 0) >= 10_000).length

  // Total fees — always populated on Solana, proxy for real on-chain activity depth
  const totalFeesUsd = transactions.reduce((s, t) => s + (t.gasQuote ?? 0), 0)

  // Liquid staking from balances — most tamper-resistant signal
  const stakingBals = balances.filter(
    (b) => !b.isSpam && SOLANA_STAKING_SYMBOLS.has(b.symbol.toUpperCase()) && b.quote > 0
  )

  return {
    swaps,
    p2pTransfers,
    staking,
    nft,
    defi,
    other,
    uniqueP2pRecipients: p2pRecipients.size,
    uniqueDefiProtocols,
    totalFeesUsd,
    nativeSolVolumeUsd,
    largeSolTxCount,
    liquidStakingUsd: stakingBals.reduce((s, b) => s + b.quote, 0),
    liquidStakingSymbols: [...new Set(stakingBals.map((b) => b.symbol))],
  }
}

export function buildSolanaBreakdown(
  transactions: Transaction[],
  balances: TokenBalance[]
): SolanaBreakdown {
  const p = analyzeSolana(transactions, balances)
  return {
    swaps: p.swaps,
    p2pTransfers: p.p2pTransfers,
    staking: p.staking,
    nft: p.nft,
    other: p.defi + p.other,
    topProtocols: [...p.uniqueDefiProtocols]
      .filter((name) => !name.startsWith("0x") && name.length < 20) // names only, not raw addresses
      .slice(0, 10),
    totalFeesUsd: p.totalFeesUsd,
    nativeSolVolumeUsd: p.nativeSolVolumeUsd,
    largeSolTxCount: p.largeSolTxCount,
    liquidStakingUsd: p.liquidStakingUsd,
    liquidStakingSymbols: p.liquidStakingSymbols,
  }
}
