const HL_URL = "https://api.hyperliquid.xyz/info"

async function hlPost<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(HL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

export type HLClearinghouseResponse = import("../types").HyperliquidState

export interface HLFillsResponse {
  coin: string
  px: string
  sz: string
  side: string
  time: number
  startPosition: string
  dir: string
  closedPnl: string
  hash: string
  crossed: boolean
  fee: string
  tid: number
}

export interface HLDelegatorSummary {
  delegated: string
  undelegated: string
  totalPendingWithdrawal: string
  nPendingWithdrawals: number
}

export async function getHyperliquidState(wallet: string): Promise<HLClearinghouseResponse | null> {
  return hlPost<HLClearinghouseResponse>({ type: "clearinghouseState", user: wallet })
}

export async function getHyperliquidFills(wallet: string): Promise<HLFillsResponse[]> {
  const startTime = Date.now() - 90 * 24 * 60 * 60 * 1000 // 90 days
  const result = await hlPost<HLFillsResponse[]>({
    type: "userFillsByTime",
    user: wallet,
    startTime,
  })
  return result ?? []
}

export async function getHyperliquidDelegator(wallet: string): Promise<HLDelegatorSummary | null> {
  return hlPost<HLDelegatorSummary>({ type: "delegatorSummary", user: wallet })
}
