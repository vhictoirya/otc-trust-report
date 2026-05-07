import { getGoldRushClient, PRIORITY_CHAINS } from "./client"
import type { Transaction, LogEvent } from "../types"

const LAMPORTS_PER_SOL = 1_000_000_000
const SOLANA_RPC = "https://api.mainnet-beta.solana.com"

// Program ID → human-readable protocol name used by SOLANA_REPUTABLE_NAMES
const PROGRAM_NAME_MAP: Record<string, string> = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "jupiter",
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: "jupiter",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "raydium",
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: "raydium",
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "orca",
  "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP": "orca",
  MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD: "marinade",
  jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL: "jito",
  dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH: "drift",
  KLend2g3cP87fffoy8q1mQqGKjrL9jGHmSeFJ6m6TYA: "kamino",
  LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: "meteora",
  MFv2hWf31Z9kbCa1snEPdcgp168vLs2Z7Cs8SYXNbfe: "meteora",
  So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo: "solend",
  mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68: "mango",
  TSWAPaqyCSx2KABk68Shruf4rp7CxcAi9LVkkawhTc: "tensor",
  M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K: "magic eden",
}

export async function getTransactions(
  wallet: string,
  activeChainNames: string[],
  limit = 100
): Promise<Transaction[]> {
  const chains = activeChainNames.length > 0
    ? activeChainNames.slice(0, 5)
    : PRIORITY_CHAINS.slice(0, 3)

  // Covalent TransactionService does not support solana-mainnet — use Solana JSON-RPC directly
  if (chains.length === 1 && chains[0] === "solana-mainnet") {
    return fetchSolanaTransactions(wallet, limit)
  }

  const client = getGoldRushClient()
  const allTxs: Transaction[] = []

  await Promise.allSettled(
    chains.map(async (chain) => {
      try {
        const pages = client.TransactionService.getAllTransactionsForAddress(
          chain as Parameters<typeof client.TransactionService.getAllTransactionsForAddress>[0],
          wallet,
          { quoteCurrency: "USD", noLogs: false }
        )

        let count = 0
        for await (const page of pages) {
          if (page.error || !page.data?.items) continue

          for (const tx of page.data.items) {
            if (count >= limit) break
            if (!tx.tx_hash) continue

            allTxs.push({
              txHash: tx.tx_hash,
              blockSignedAt: tx.block_signed_at ? new Date(tx.block_signed_at).toISOString() : "",
              fromAddress: tx.from_address ?? "",
              toAddress: tx.to_address ?? "",
              value: tx.value?.toString() ?? "0",
              valueQuote: tx.value_quote ?? 0,
              gasSpent: tx.gas_spent ?? 0,
              gasQuote: tx.gas_quote ?? 0,
              successful: tx.successful ?? false,
              logEvents: mapEvmLogEvents(tx.log_events ?? []),
            })
            count++
          }

          if (count >= limit) break
        }
      } catch {
        // continue with other chains
      }
    })
  )

  return allTxs
}

// ─── Solana JSON-RPC implementation ──────────────────────────────────────────

async function fetchSolPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    )
    const data = (await res.json()) as { solana?: { usd?: number } }
    if (data.solana?.usd) return data.solana.usd
  } catch {
    // fall through
  }
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT")
    const data = (await res.json()) as { price?: string }
    if (data.price) return parseFloat(data.price)
  } catch {
    return 0
  }
  return 0
}

interface SigInfo {
  signature: string
  blockTime: number | null
  err: unknown
}

interface SolanaInstruction {
  program?: string
  programId: string
  parsed?: {
    type?: string
    info?: Record<string, unknown>
  }
  stackHeight?: number
}

interface SolanaTokenBalance {
  accountIndex: number
  mint: string
  owner: string
  uiTokenAmount: { uiAmount?: number | null }
}

interface SolanaTxResult {
  blockTime: number | null
  meta: {
    err: unknown
    fee: number
    preBalances: number[]
    postBalances: number[]
    preTokenBalances?: SolanaTokenBalance[]
    postTokenBalances?: SolanaTokenBalance[]
    innerInstructions?: Array<{
      index: number
      instructions: SolanaInstruction[]
    }>
  }
  transaction: {
    signatures: string[]
    message: {
      accountKeys: Array<{ pubkey: string; signer: boolean; writable: boolean }>
      instructions: SolanaInstruction[]
    }
  }
}

async function fetchSolanaTransactions(wallet: string, limit: number): Promise<Transaction[]> {
  const solPriceUsd = await fetchSolPrice()

  // Phase 1: One call to get ALL signatures — gives us count, timestamps, and success status
  let signatures: SigInfo[] = []
  try {
    const sigsRes = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [wallet, { limit }],
      }),
    })
    const sigsData = (await sigsRes.json()) as { result?: SigInfo[] }
    signatures = sigsData.result ?? []
  } catch {
    return []
  }

  if (signatures.length === 0) return []

  // Phase 2: Build sig-only Transaction for every signature immediately.
  // This ensures total count, heatmap, and fail-rate are always accurate.
  const txMap = new Map<string, Transaction>()
  for (const sig of signatures) {
    txMap.set(sig.signature, sigOnlyFallback(sig, wallet, solPriceUsd))
  }

  // Phase 3: Fetch full transaction details for the most recent DETAIL_LIMIT txs,
  // sequentially with 350ms spacing to stay within the public RPC rate limit (~3/s).
  // On 429 or null, the sig-only fallback already in txMap is kept.
  const DETAIL_LIMIT = Math.min(20, signatures.length)

  for (let i = 0; i < DETAIL_LIMIT; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 350))
    const sig = signatures[i]
    try {
      const res = await fetch(SOLANA_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTransaction",
          params: [sig.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
        }),
      })
      const data = (await res.json()) as { result?: SolanaTxResult | null; error?: unknown }
      if (data.result) {
        txMap.set(sig.signature, mapSolanaResult(data.result, wallet, solPriceUsd))
      }
      // 429 or null result → sig-only fallback already in txMap
    } catch {
      // keep sig-only
    }
  }

  return [...txMap.values()]
}

function sigOnlyFallback(sig: SigInfo, wallet: string, solPriceUsd: number): Transaction {
  return {
    txHash: sig.signature,
    blockSignedAt: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : "",
    fromAddress: wallet,
    toAddress: "",
    value: "0",
    valueQuote: 0,
    gasSpent: 5000,
    gasQuote: (5000 / LAMPORTS_PER_SOL) * solPriceUsd,
    successful: sig.err === null || sig.err === undefined,
    logEvents: [],
  }
}

function mapSolanaResult(tx: SolanaTxResult, wallet: string, solPriceUsd: number): Transaction {
  const accountKeys = tx.transaction.message.accountKeys
  const feePayer = accountKeys[0]?.pubkey ?? wallet
  const fee = tx.meta?.fee ?? 5000
  const isSuccess = tx.meta?.err === null || tx.meta?.err === undefined

  // Native SOL change for the wallet address (absolute value of balance delta)
  const walletIdx = accountKeys.findIndex((k) => k.pubkey === wallet)
  const preBalance = tx.meta.preBalances[walletIdx] ?? 0
  const postBalance = tx.meta.postBalances[walletIdx] ?? 0
  const nativeSolLamports = Math.abs(postBalance - preBalance)

  // Collect all instructions (top-level + inner) for protocol detection
  const allInstructions: SolanaInstruction[] = [
    ...tx.transaction.message.instructions,
    ...(tx.meta.innerInstructions ?? []).flatMap((i) => i.instructions),
  ]

  // Build logEvents — senderName prefers human-readable protocol name, senderAddress = programId
  const seen = new Set<string>()
  const logEvents: LogEvent[] = []
  for (const ix of allInstructions) {
    if (!ix.programId) continue
    const programId = ix.programId
    // Deduplicate by programId+type to keep logEvents clean
    const key = programId + (ix.parsed?.type ?? "")
    if (seen.has(key)) continue
    seen.add(key)

    const senderName = PROGRAM_NAME_MAP[programId] ?? ix.program ?? ""
    const decoded = ix.parsed
      ? {
          name: ix.parsed.type ?? "",
          params: Object.entries(ix.parsed.info ?? {}).map(([k, v]) => ({
            name: k,
            value: String(v),
          })),
        }
      : null

    logEvents.push({
      senderName,
      senderAddress: programId,
      senderContractDecimals: 0,
      decoded,
    })
  }

  // toAddress: for P2P SOL sends → actual recipient; otherwise → first non-trivial program
  let toAddress = ""
  for (const ix of tx.transaction.message.instructions) {
    if (ix.program === "system" && ix.parsed?.type === "transfer") {
      toAddress = String(ix.parsed.info?.destination ?? "")
      break
    }
  }
  if (!toAddress) {
    const skip = new Set([
      "ComputeBudget111111111111111111111111111111",
      "11111111111111111111111111111111",
    ])
    toAddress =
      tx.transaction.message.instructions.find(
        (ix) => ix.programId && !skip.has(ix.programId)
      )?.programId ?? ""
  }

  // Extract SPL token balance changes for the wallet
  const preTokenByMint = new Map<string, number>()
  const postTokenByMint = new Map<string, number>()
  for (const b of tx.meta.preTokenBalances ?? []) {
    if (b.owner === wallet) {
      preTokenByMint.set(b.mint, b.uiTokenAmount?.uiAmount ?? 0)
    }
  }
  for (const b of tx.meta.postTokenBalances ?? []) {
    if (b.owner === wallet) {
      postTokenByMint.set(b.mint, b.uiTokenAmount?.uiAmount ?? 0)
    }
  }
  const allMints = new Set([...preTokenByMint.keys(), ...postTokenByMint.keys()])
  const solanaTokenChanges: { mint: string; uiAmountChange: number }[] = []
  for (const mint of allMints) {
    const change = Math.abs((postTokenByMint.get(mint) ?? 0) - (preTokenByMint.get(mint) ?? 0))
    if (change > 0) solanaTokenChanges.push({ mint, uiAmountChange: change })
  }

  return {
    txHash: tx.transaction.signatures[0] ?? "",
    blockSignedAt: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : "",
    fromAddress: feePayer,
    toAddress,
    value: String(nativeSolLamports),
    valueQuote: (nativeSolLamports / LAMPORTS_PER_SOL) * solPriceUsd,
    gasSpent: fee,
    gasQuote: (fee / LAMPORTS_PER_SOL) * solPriceUsd,
    successful: isSuccess,
    logEvents,
    solanaTokenChanges: solanaTokenChanges.length > 0 ? solanaTokenChanges : undefined,
  }
}

// ─── EVM log event mapping (unchanged) ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvmLogEvents(events: any[]): LogEvent[] {
  return events.map((e) => ({
    senderName: e.sender_name ?? "",
    senderAddress: e.sender_address ?? "",
    senderContractDecimals: e.sender_contract_decimals ?? 18,
    decoded: e.decoded
      ? {
          name: e.decoded.name ?? "",
          params: (e.decoded.params ?? []).map((p: { name?: string; value?: unknown }) => ({
            name: p.name ?? "",
            value: String(p.value ?? ""),
          })),
        }
      : null,
  }))
}
