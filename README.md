# OTC Trust Report

> Instant counterparty intelligence from full on-chain history — powered by GoldRush API.

**Live demo: https://otc-trust-report.vercel.app/**

Know who you're trading with before the deal closes. OTC Trust Report generates a structured, scored trust profile for any EVM or Solana wallet in under 30 seconds, using real on-chain data rather than self-reported claims.

**Built for the GoldRush / Covalent Hackathon** — Compliance & Risk track.

---

## The Problem

OTC crypto trades are trust-based. You're wiring six or seven figures to a counterparty you've never met, whose only proof of legitimacy is a wallet address. There is no credit score, no KYC check, no trade history you can pull up in seconds. Most traders verify manually — copy the address, paste it into Etherscan, scroll through transactions, check a few block explorers — a process that takes 20–40 minutes per counterparty and still misses cross-chain activity, token approval risk, and behavioural red flags.

OTC Trust Report solves this in one lookup.

---

## What It Does

Enter any EVM wallet address, Solana address, or ENS name. Within 30 seconds you get:

- **Overall trust score** (0–100) with risk level: CRITICAL / HIGH / MEDIUM / LOW / TRUSTED
- **Four scored pillars**: Identity, Financial Strength, Track Record, Security
- **Automated flags**: mixer exposure, OFAC sanctions, velocity spikes, sample size warnings, wallet age vs portfolio incongruence, concentrated funding source
- **Charts**: portfolio composition, activity heatmap, cumulative transaction activity, chain timeline, approval exposure (EVM) or Solana activity breakdown
- **PDF export** and **share link** for sending to counterparties or compliance teams

---

## GoldRush APIs Used

| Endpoint | What it powers |
|---|---|
| `AllChainsService.getChainActivity` | Detects which chains the wallet is active on — seeds the scoring with cross-chain breadth |
| `BalanceService.getTokenBalancesForWalletAddress` | Portfolio composition, USD value, blue-chip ratio, spam filtering, token prices for ERC20 enrichment |
| `TransactionService.getAllTransactionsForAddress` | Full transaction history for EVM chains — volume, large transfers, counterparty diversity, velocity, DeFi protocol interactions |
| `SecurityService.getApprovals` | Token approval exposure — value at risk, high-risk spenders, open approval count |

> Solana transaction history is fetched directly via the Solana JSON-RPC (`getSignaturesForAddress` + `getTransaction`) because the GoldRush TransactionService does not currently support `solana-mainnet` on this endpoint. All other Solana data (balances, chain activity) comes from GoldRush.

---

## Scoring Model

The trust score is built from four independent pillars:

### Identity (20 pts)
Wallet age, chain diversity, transaction volume, ENS/domain ownership signals. Older wallets active across more chains score higher.

### Financial Strength (25 pts)
Portfolio size, blue-chip ratio (ETH/BTC/SOL/USDC/USDT weighting), asset diversification. Rewards wallets with meaningful, non-spam holdings.

### Track Record (35 pts)
Transaction count, large transfer history ($10k+), counterparty network breadth (both outgoing and incoming), DeFi protocol diversity, activity velocity spike detection.

### Security (20 pts)
Token approval hygiene (value at risk, spender count, high-risk spenders), OFAC SDN address exposure (−15 pts), mixer/tumbler contract interactions (−10 pts). Solana uses a separate sub-scorer based on privacy protocol exposure, reputable protocol usage, and liquid staking held.

---

## Flags System

Beyond the score, the report surfaces binary flags that a number can't capture:

- **CRITICAL**: OFAC-sanctioned address interaction, mixer/tumbler exposure
- **WARNING**: >50% of portfolio exposed via open approvals, high tx failure rate, sample size limit hit, new wallet (<3 months) with large holdings, >80% of incoming txs from one address
- **INFO**: Median transaction size (compare to your proposed OTC amount), Hyperliquid perp volume
- **POSITIVE**: Large transfer track record ($50k+), multi-chain activity, strong overall score

---

## Stack

- **Next.js 14** (App Router, server components for all data fetching)
- **GoldRush SDK** (`@covalenthq/client-sdk`)
- **Recharts** for all data visualisations
- **Tailwind CSS v4**
- **date-fns** for all date arithmetic
- **TypeScript** throughout

---

## Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/otc-trust-report
cd otc-trust-report

# 2. Install dependencies
npm install

# 3. Set your GoldRush API key
cp .env.example .env.local
# Edit .env.local and add your key from https://goldrush.dev

# 4. Start the dev server
npm run dev
```

Open `http://localhost:3000`.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOLDRUSH_API_KEY` | Yes | Get a free key at [goldrush.dev](https://goldrush.dev) |

---

## Project Structure

```
lib/
  goldrush/       # GoldRush API clients (balances, transactions, security, cross-chain)
  scoring/        # Scoring engine — identity, financial, trackRecord, security, solana
  types.ts        # Shared TypeScript interfaces
  ens.ts          # ENS name resolution

app/
  page.tsx                    # Landing page with wallet search + ENS resolution
  report/[wallet]/page.tsx    # Server component — fetches all data, builds report
  report/[wallet]/ReportClient.tsx  # Client component — renders charts and UI

components/report/  # All chart and display components
```

---

## Deploying to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this repo to GitHub
2. Import into Vercel
3. Add `GOLDRUSH_API_KEY` in the Environment Variables section
4. Deploy

---

## Limitations

- **Transaction sample**: GoldRush returns up to 100 transactions per EVM chain (5 chains max) and the Solana RPC returns up to 200 signatures. Wallets with thousands of transactions are scored on a sample — flagged with a warning.
- **ERC20 volume**: Computed by parsing `Transfer` log events and matching token prices from the current balance. Tokens that have been fully sold won't have a price reference.
- **Solana volume**: Only accounts for native SOL transfers and SPL tokens currently held in the wallet (price available). Sold or airdropped tokens with no price data are excluded.
- **OFAC / mixer lists**: Curated static snapshots of known addresses. Not a live compliance feed — do not use as a sole compliance check in production.
- **Solana protocol detection**: Based on the 20 most recent transactions for which full data is available, limited by the Solana public RPC rate limit.

---

## License

MIT
