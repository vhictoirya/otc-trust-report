import { getGoldRushClient } from "./client"
import type { ChainActivity } from "../types"

// Maps GoldRush activity labels → SDK chain slugs
const LABEL_TO_SLUG: Record<string, string> = {
  "Ethereum Mainnet": "eth-mainnet",
  "Polygon Mainnet": "matic-mainnet",
  "BNB Smart Chain": "bsc-mainnet",
  "Avalanche C-Chain Mainnet": "avalanche-mainnet",
  "Arbitrum Mainnet": "arbitrum-mainnet",
  "Arbitrum Nova Mainnet": "arbitrum-nova-mainnet",
  "Optimism Mainnet": "optimism-mainnet",
  "Base Mainnet": "base-mainnet",
  "Fantom Opera": "fantom-mainnet",
  "Linea Mainnet": "linea-mainnet",
  "Mantle Mainnet": "mantle-mainnet",
  "Gnosis Mainnet": "gnosis-mainnet",
  "Celo Mainnet": "celo-mainnet",
  "Moonbeam Mainnet": "moonbeam-mainnet",
  "Moonbeam Moonriver": "moonbeam-mainnet",
  "Zksync Era Mainnet": "zksync-mainnet",
  "Scroll Mainnet": "scroll-mainnet",
  "Blast Mainnet": "blast-mainnet",
  "Berachain Mainnet": "berachain-mainnet",
  "Monad Mainnet": "monad-mainnet",
  "Sei Mainnet": "sei-mainnet",
  "Sonic Mainnet": "sonic-mainnet",
  "Taiko Mainnet": "taiko-mainnet",
  "Unichain Mainnet": "unichain-mainnet",
  "Apechain Mainnet": "apechain-mainnet",
  "HyperEVM Mainnet": "hyperevm-mainnet",
  "Ink Mainnet": "ink-mainnet",
  "Solana Mainnet": "solana-mainnet",
  "Bnb Opbnb Mainnet": "bnb-opbnb-mainnet",
  "ZetaChain Mainnet": "zetachain-mainnet",
  "Plasma Mainnet": "plasma-mainnet",
  "Axie Mainnet": "axie-mainnet",
  "Viction Mainnet": "viction-mainnet",
  "Redstone Mainnet": "redstone-mainnet",
  "Canto Mainnet": "canto-mainnet",
}

export async function getActiveChains(wallet: string): Promise<ChainActivity[]> {
  const client = getGoldRushClient()
  const results: ChainActivity[] = []

  try {
    const resp = await client.AllChainsService.getAddressActivity(wallet)
    if (resp.error || !resp.data?.items) return []

    for (const item of resp.data.items) {
      const label = String(item.label ?? "")
      const slug = LABEL_TO_SLUG[label] ?? label
      results.push({
        chainId: String(item.chain_id ?? ""),
        chainName: slug,
        lastSeen: String(item.last_seen_at ?? ""),
        isActive: true,
      })
    }
  } catch {
    // graceful fallback
  }

  return results
}
