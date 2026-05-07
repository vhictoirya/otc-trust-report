export interface ChainActivity {
  chainId: string
  chainName: string
  lastSeen: string
  isActive: boolean
}

export interface TokenBalance {
  contractAddress: string
  contractName: string
  symbol: string
  balance: string
  quote: number
  quoteRate: number
  isSpam: boolean
  isNative: boolean
  logoUrl: string
}

export interface Transaction {
  txHash: string
  blockSignedAt: string
  fromAddress: string
  toAddress: string
  value: string
  valueQuote: number
  gasSpent: number
  gasQuote: number
  successful: boolean
  logEvents: LogEvent[]
  estimatedTransferUsd?: number  // set in engine after token price enrichment
  // Solana only: absolute SPL token balance changes for the wallet in this tx
  solanaTokenChanges?: { mint: string; uiAmountChange: number }[]
}

export interface LogEvent {
  senderName: string
  senderAddress: string
  senderContractDecimals: number
  decoded: {
    name: string
    params: { name: string; value: string }[]
  } | null
}

export interface Approval {
  tokenAddress: string
  tickerSymbol: string
  balance: string
  valueAtRiskQuote: number
  spenders: {
    spenderAddress: string
    allowance: string
    valueAtRisk: number
    riskFactor: string
  }[]
}

export interface HyperliquidState {
  marginSummary: {
    accountValue: string
    totalRawUsd: string
    totalMarginUsed: string
    withdrawable: string
  }
  crossMaintenanceMarginUsed: string
  liquidated: boolean
  assetPositions: {
    position: {
      coin: string
      szi: string
      entryPx: string
      positionValue: string
      unrealizedPnl: string
      returnOnEquity: string
      leverage: { type: string; value: number }
    }
    type: string
  }[]
}

export interface HyperliquidFill {
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

export interface PillarScore {
  score: number
  maxScore: number
  signals: { label: string; value: string; impact: "positive" | "neutral" | "negative" }[]
}

export interface TrustReport {
  wallet: string
  generatedAt: string
  overallScore: number
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "TRUSTED"
  pillars: {
    identity: PillarScore
    financial: PillarScore
    trackRecord: PillarScore
    security: PillarScore
  }
  flags: Flag[]
  summary: {
    totalPortfolioUsd: number
    activeChains: number
    totalTransactions: number
    walletAgeMonths: number
    totalVolumeUsd: number
    valueAtRiskUsd: number
    hyperliquidVolume: number
    blueChipRatio: number
  }
  chartData: ChartData
}

export interface Flag {
  type: "critical" | "warning" | "info" | "positive"
  message: string
}

export interface SolanaBreakdown {
  swaps: number
  p2pTransfers: number
  staking: number
  nft: number
  other: number
  topProtocols: string[]
  totalFeesUsd: number
  nativeSolVolumeUsd: number
  largeSolTxCount: number
  liquidStakingUsd: number
  liquidStakingSymbols: string[]
}

export interface ChartData {
  portfolioComposition: { name: string; value: number; color: string }[]
  activityHeatmap: { date: string; count: number }[]
  pnlCurve: { date: string; pnl: number; cumulative: number }[]
  chainActivity: { chain: string; firstSeen: string; lastSeen: string; active: boolean }[]
  hyperliquidVolume: { date: string; volume: number; pnl: number }[]
  valueAtRisk: { label: string; value: number; color: string }[]
  solanaBreakdown?: SolanaBreakdown
}

export interface RawWalletData {
  activeChains: ChainActivity[]
  balances: TokenBalance[]
  transactions: Transaction[]
  approvals: Approval[]
  hyperliquidState: HyperliquidState | null
  hyperliquidFills: HyperliquidFill[]
}
