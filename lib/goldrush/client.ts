import { GoldRushClient } from "@covalenthq/client-sdk"

let _client: GoldRushClient | null = null

export function getGoldRushClient(): GoldRushClient {
  if (!_client) {
    const key = process.env.GOLDRUSH_API_KEY
    if (!key) throw new Error("GOLDRUSH_API_KEY is not set")
    _client = new GoldRushClient(key)
  }
  return _client
}

export const BLUE_CHIP_SYMBOLS = new Set([
  "ETH", "WETH", "BTC", "WBTC", "SOL", "WSOL",
  "USDC", "USDT", "DAI", "BUSD", "FRAX", "LUSD",
  "BNB", "MATIC", "AVAX", "ARB", "OP",
  // Solana liquid staking — reliable credibility signal
  "MSOL", "JITOSOL", "BSOL", "STSOL", "SCNSOL", "LAINESOL", "JSOL",
])

export const PRIORITY_CHAINS = [
  "eth-mainnet",
  "matic-mainnet",
  "bsc-mainnet",
  "arbitrum-mainnet",
  "optimism-mainnet",
  "avalanche-mainnet",
  "base-mainnet",
]
