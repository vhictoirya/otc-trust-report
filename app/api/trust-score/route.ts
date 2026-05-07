import { NextRequest, NextResponse } from "next/server"
import { getActiveChains } from "@/lib/goldrush/crosschain"
import { getBalances } from "@/lib/goldrush/balances"
import { getTransactions } from "@/lib/goldrush/transactions"
import { getApprovals } from "@/lib/goldrush/security"
import {
  getHyperliquidState,
  getHyperliquidFills,
  getHyperliquidDelegator,
} from "@/lib/hyperliquid/client"
import { buildTrustReport } from "@/lib/scoring/engine"
import type { RawWalletData } from "@/lib/types"

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")
  if (!wallet) {
    return NextResponse.json({ error: "wallet parameter is required" }, { status: 400 })
  }

  const isEvm = wallet.startsWith("0x") && wallet.length === 42
  const isSolana = wallet.length >= 32 && wallet.length <= 44 && !wallet.startsWith("0x")

  if (!isEvm && !isSolana) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
  }

  try {
    // Phase 1: discover active chains
    const activeChains = isEvm ? await getActiveChains(wallet) : []
    const activeChainNames = activeChains.map((c) => c.chainName)

    // Phase 2 + Hyperliquid: parallel fetch
    const [balances, transactions, approvals, hlState, hlFills] = await Promise.all([
      getBalances(wallet, activeChainNames),
      getTransactions(wallet, activeChainNames),
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

    const report = buildTrustReport(wallet, rawData)

    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    })
  } catch (err) {
    console.error("trust-score error:", err)
    return NextResponse.json(
      { error: "Failed to generate trust report. Check API keys and try again." },
      { status: 500 }
    )
  }
}
