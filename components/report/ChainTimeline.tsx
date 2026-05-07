"use client"

interface Props {
  chains: { chain: string; lastSeen: string; active: boolean }[]
}

const CHAIN_COLORS: Record<string, string> = {
  "eth-mainnet": "#6366f1",
  "matic-mainnet": "#8b5cf6",
  "bsc-mainnet": "#f59e0b",
  "arbitrum-mainnet": "#3b82f6",
  "optimism-mainnet": "#ef4444",
  "avalanche-mainnet": "#ef4444",
  "base-mainnet": "#2563eb",
}

function getChainColor(chainName: string): string {
  return CHAIN_COLORS[chainName.toLowerCase()] ?? "#6366f1"
}

function formatChainName(name: string): string {
  return name
    .replace("-mainnet", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ChainTimeline({ chains }: Props) {
  if (chains.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
        No multi-chain activity found
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chains.map((c, i) => (
        <div
          key={`${c.chain}-${i}`}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/8"
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: getChainColor(c.chain) }}
          />
          <span className="text-sm text-gray-300">{formatChainName(c.chain)}</span>
          {c.lastSeen && (
            <span className="text-xs text-gray-600">
              {new Date(c.lastSeen).getFullYear()}
            </span>
          )}
          {c.active && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  )
}
