import { getGoldRushClient, PRIORITY_CHAINS } from "./client"
import type { TokenBalance } from "../types"

export async function getBalances(wallet: string, activeChainNames: string[]): Promise<TokenBalance[]> {
  const client = getGoldRushClient()
  const allBalances: TokenBalance[] = []

  const chains = activeChainNames.length > 0
    ? activeChainNames.slice(0, 5)
    : PRIORITY_CHAINS.slice(0, 3)

  await Promise.allSettled(
    chains.map(async (chain) => {
      try {
        const resp = await client.BalanceService.getTokenBalancesForWalletAddress(
          chain as Parameters<typeof client.BalanceService.getTokenBalancesForWalletAddress>[0],
          wallet,
          { quoteCurrency: "USD" }
        )
        if (resp.error || !resp.data?.items) return

        for (const item of resp.data.items) {
          allBalances.push({
            contractAddress: item.contract_address ?? "",
            contractName: item.contract_name ?? "",
            symbol: item.contract_ticker_symbol ?? "",
            balance: item.balance?.toString() ?? "0",
            quote: item.quote ?? 0,
            quoteRate: item.quote_rate ?? 0,
            isSpam: item.is_spam ?? false,
            isNative: item.native_token ?? false,
            logoUrl: item.logo_url ?? "",
          })
        }
      } catch {
        // continue with other chains
      }
    })
  )

  return allBalances
}
