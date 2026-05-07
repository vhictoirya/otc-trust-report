import { getGoldRushClient, PRIORITY_CHAINS } from "./client"
import type { Approval } from "../types"

export async function getApprovals(wallet: string, activeChainNames: string[]): Promise<Approval[]> {
  const client = getGoldRushClient()
  const allApprovals: Approval[] = []

  const chains = activeChainNames.length > 0
    ? activeChainNames.slice(0, 4)
    : PRIORITY_CHAINS.slice(0, 2)

  await Promise.allSettled(
    chains.map(async (chain) => {
      try {
        const resp = await client.SecurityService.getApprovals(
          chain as Parameters<typeof client.SecurityService.getApprovals>[0],
          wallet
        )
        if (resp.error || !resp.data?.items) return

        for (const item of resp.data.items) {
          allApprovals.push({
            tokenAddress: item.token_address ?? "",
            tickerSymbol: item.ticker_symbol ?? "",
            balance: item.balance?.toString() ?? "0",
            valueAtRiskQuote: (item.value_at_risk_quote as number) ?? 0,
            spenders: (item.spenders ?? []).map((s) => ({
              spenderAddress: String(s.spender_address ?? ""),
              allowance: s.allowance?.toString() ?? "0",
              valueAtRisk: Number(s.value_at_risk ?? 0),
              riskFactor: String(s.risk_factor ?? "UNKNOWN"),
            })),
          })
        }
      } catch {
        // continue with other chains
      }
    })
  )

  return allApprovals
}
