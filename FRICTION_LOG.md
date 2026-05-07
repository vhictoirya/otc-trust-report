# GoldRush API Friction Log

Developer experience notes from building OTC Trust Report during the GoldRush Hackathon. Recorded honestly — what worked, what didn't, what cost the most time.

---

## 1. Solana `TransactionService` — Silent 501 with No SDK Warning

**Endpoint**: `TransactionService.getAllTransactionsForAddress("solana-mainnet", wallet)`

**What happened**: The call returns an async generator. Each yielded page has `page.error = true` and `page.data = null`. The SDK does not throw — it silently yields error pages. There is no indication in the TypeScript types, the SDK docs, or the error message itself that `solana-mainnet` is simply not supported on this endpoint.

**Time lost**: ~3 hours. We assumed the data was returning empty because the wallet had no transactions. We debugged the mapping logic, the chain name format, and the async generator before finally hitting the raw REST endpoint directly and getting:

```json
{
  "error": true,
  "error_message": "Chain: solana-mainnet is not currently supported for this endpoint.",
  "error_code": 501
}
```

**What we expected**: Either a TypeScript type that excludes `"solana-mainnet"` as a valid parameter for this method, or an SDK-level throw with a clear message on the first page, or documentation on the method page that lists supported chains.

**Workaround**: Implemented a parallel Solana fetcher using `getSignaturesForAddress` + `getTransaction` via the public Solana JSON-RPC (`api.mainnet-beta.solana.com`), then merged results with GoldRush balance data.

---

## 2. Public Solana RPC Rate Limits Kill Batch Fetching

**What happened**: After working around issue #1 with the Solana JSON-RPC, we implemented batched `getTransaction` requests (10 per HTTP call, standard JSON-RPC array format). The public endpoint (`api.mainnet-beta.solana.com`) returns 429 for most requests within a batch, even with delays between batches:

```json
{"jsonrpc":"2.0","error":{"code":429,"message":"Too many requests for a specific RPC call"},"id":2}
```

Individual sequential requests work but are throttled to approximately 1–2 per second. Fetching full data for 20 transactions serially adds ~7 seconds to every Solana report.

**Impact**: Solana protocol detection and volume calculation only covers the 20 most recent transactions. The remaining 180 (out of 200 fetched) are timestamp-only — enough for the heatmap and fail rate, but not for DeFi protocol classification.

**What would help**: If GoldRush supported `solana-mainnet` in `TransactionService`, this entire problem disappears. The EVM path works beautifully — paginated, structured, decoded, with USD pricing. Solana deserves the same.

---

## 3. `valueQuote` is Always 0 for ERC20 Token Transfers

**Endpoint**: `TransactionService.getAllTransactionsForAddress` (EVM)

**What happened**: Transactions where value is transferred in ERC20 tokens (USDC, WETH, etc.) return `tx.value_quote = 0`. This is technically correct — `value` represents the raw ETH sent with the transaction, which is 0 for token transfers. But for a scoring application calculating on-chain volume or large transfer history, it makes the data nearly useless for wallets that primarily use stablecoins.

**Workaround**: Parse the `log_events` array on each transaction, find events where `decoded.name === "Transfer"`, extract the raw `value` param, divide by `10^sender_contract_decimals`, and multiply by the token's `quote_rate` from the balances endpoint. This works but requires cross-referencing two endpoints and adds significant complexity.

**What would help**: A `token_value_quote` field on the transaction object — the USD value of the primary token transfer event — would eliminate this entirely. GoldRush already classifies transactions (DEX swaps, stablecoin transfers), so the data is there.

---

## 4. `sender_contract_decimals` Missing from TypeScript Types

**Endpoint**: `TransactionService` log events

**What happened**: The `log_events` items in the TypeScript SDK types do not include `sender_contract_decimals`, even though the REST API returns it. To access it we had to cast:

```typescript
(e as { sender_contract_decimals?: number }).sender_contract_decimals ?? 18
```

Same issue with `sender_address` on log events.

**Impact**: Parsing ERC20 transfer values (workaround from issue #3) requires unsafe TypeScript casts. Not a blocker, but it erodes type safety and adds friction.

---

## 5. No `getChainActivity` Equivalent in the SDK Type Signatures

**What happened**: Finding the right method for cross-chain wallet activity required reading through the SDK source. `AllChainsService` is not prominently documented. The method we needed (`getChainActivity`) is not in the main "Getting Started" flow.

**Time lost**: ~30 minutes of SDK exploration before finding `getAllChainActivity`.

---

## 6. Solana Balance `contract_address` Field Meaning Is Unclear

**Endpoint**: `BalanceService.getTokenBalancesForWalletAddress("solana-mainnet", wallet)`

**What happened**: For Solana tokens, `contract_address` is the SPL token mint address. This is correct and useful, but it's not documented. We needed to match token prices (from balances) against token mint addresses (from Solana JSON-RPC `preTokenBalances`/`postTokenBalances`). We assumed they'd match after lowercasing both — they do, but we weren't certain until we verified manually.

**What would help**: A note in the Solana-specific balance docs confirming that `contract_address` = mint address for SPL tokens.

---

## 7. `SecurityService.getApprovals` Does Not Support Solana

**What happened**: Similar to issue #1 — calling `getApprovals` for a Solana wallet returns an error. Unlike issue #1, this is more expected (ERC-20 approvals don't exist on Solana). However there is no Solana-equivalent endpoint for SPL token delegates.

**Impact**: The "Value at Risk" metric is always $0 for Solana wallets, which looks like a bug next to a $3.59B portfolio. We worked around this by replacing the stat label with "Token Delegates: SPL (safe)" and explaining the model difference.

**What would help**: An endpoint that returns SPL token delegate state for Solana wallets, or documentation explicitly noting that the SPL approve model means value-at-risk is not applicable.

---

## What Worked Well

**EVM balance data is excellent.** `getTokenBalancesForWalletAddress` returns rich metadata — spam filtering, USD pricing, token logos, decimals — all in one call. Zero friction.

**`getAllTransactionsForAddress` with `noLogs: false` is genuinely powerful.** Having decoded log events with `sender_name`, `sender_address`, and `decoded.params` in the same response as the transaction made ERC20 classification possible without additional lookups. This is the feature that makes GoldRush meaningfully better than raw RPC.

**Cross-chain activity detection works great.** `AllChainsService.getAllChainActivity` scanning 100+ chains in one API call is a killer feature. For an OTC trust scoring use case, knowing a wallet is active on 7 chains vs 1 chain is immediately meaningful.

**The TypeScript SDK is generally well-typed.** Async generators for paginated data are the right abstraction. The `Promise.allSettled` pattern for fetching across multiple chains in parallel works cleanly.

**Spam filtering on balances is essential.** `is_spam: true` on garbage token airdrops saved significant work on portfolio valuation logic.

---

## Summary Table

| Issue | Severity | Time Lost | Status |
|---|---|---|---|
| Solana not supported in TransactionService (silent failure) | High | ~3 hrs | Worked around with Solana JSON-RPC |
| Public Solana RPC rate limits batch fetching | Medium | ~2 hrs | Sequential fetching with 350ms delay |
| `valueQuote = 0` for ERC20 transfers | High | ~1 hr | Log event parsing workaround |
| `sender_contract_decimals` missing from SDK types | Low | 15 min | Unsafe cast |
| `AllChainsService` not prominent in docs | Low | 30 min | Found via source exploration |
| Solana `contract_address` = mint address (undocumented) | Low | 20 min | Verified manually |
| No Solana equivalent for `getApprovals` | Medium | 30 min | UI label change + scoring note |
