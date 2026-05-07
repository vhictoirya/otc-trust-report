import { notFound } from "next/navigation"
import type { RawWalletData, TrustReport } from "@/lib/types"
import { ReportClient } from "./ReportClient"
import { getActiveChains } from "@/lib/goldrush/crosschain"
import { getBalances } from "@/lib/goldrush/balances"
import { getTransactions } from "@/lib/goldrush/transactions"
import { getApprovals } from "@/lib/goldrush/security"
import { getHyperliquidState, getHyperliquidFills } from "@/lib/hyperliquid/client"
import { buildTrustReport } from "@/lib/scoring/engine"

interface Props {
  params: Promise<{ wallet: string }>
}

async function generateReport(wallet: string): Promise<TrustReport | null> {
  try {
    const isEvm = wallet.startsWith("0x") && wallet.length === 42
    const isSolana = !isEvm && wallet.length >= 32 && wallet.length <= 44

    let activeChains = isEvm ? await getActiveChains(wallet) : []

    if (isSolana) {
      activeChains = [{
        chainId: "solana-mainnet",
        chainName: "solana-mainnet",
        lastSeen: new Date().toISOString(),
        isActive: true,
      }]
    }

    const activeChainNames = activeChains.map((c) => c.chainName)

    const [balances, transactions, approvals, hlState, hlFills] = await Promise.all([
      getBalances(wallet, activeChainNames),
      getTransactions(wallet, activeChainNames, isSolana ? 200 : 100),
      isEvm ? getApprovals(wallet, activeChainNames) : Promise.resolve([]),
      isEvm ? getHyperliquidState(wallet) : Promise.resolve(null),
      isEvm ? getHyperliquidFills(wallet) : Promise.resolve([]),
    ])

    const rawData: RawWalletData = {
      activeChains,
      balances,
      transactions,
      approvals,
      hyperliquidState: hlState,
      hyperliquidFills: hlFills,
    }

    return buildTrustReport(wallet, rawData)
  } catch (err) {
    console.error("generateReport error:", err)
    return null
  }
}

export default async function ReportPage({ params }: Props) {
  const { wallet } = await params

  const isEvm = wallet.startsWith("0x") && wallet.length === 42
  const isSolana = wallet.length >= 32 && wallet.length <= 44 && !wallet.startsWith("0x")
  if (!isEvm && !isSolana) notFound()

  const report = await generateReport(wallet)
  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">Failed to generate report</div>
          <div className="text-gray-500 text-sm">Check your GoldRush API key or try again</div>
          <a href="/" className="mt-4 inline-block text-indigo-400 text-sm hover:underline">
            ← Back to search
          </a>
        </div>
      </div>
    )
  }

  return <ReportClient report={report} />
}
