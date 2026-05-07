// Known mixer/tumbler contract addresses (lowercase for comparison)
export const MIXER_CONTRACTS = new Set([
  // Tornado Cash — Ethereum ETH pools (OFAC SDN Aug 2022)
  "0xd691f27f38b395b1b6f1854eeabade67cbfdb61", // 0.01 ETH
  "0x12d66f87a04a9e220c9d5078b7961664bc9b5b1e", // 0.1 ETH
  "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936", // 1 ETH
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf", // 10 ETH
  "0xa160cdab225685da1d56aa342ad8841c3b53f291", // 100 ETH
  // Tornado Cash — Ethereum token pools
  "0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3", // DAI 100
  "0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144", // DAI 1k (cDAI)
  "0x07687e702b410fa1bad7b7c3102f9f3e08e0d282", // USDC 100
  "0x23773e65ed146a459667ad6d2e3a91c7c72b8a73", // USDT 100
  "0x22aaa7720ddd5388a3c0a3333430953c68f1849b", // WBTC 0.1
  // Tornado Cash Nova (cross-chain shielded pool)
  "0x84443cfd09a48af6ef360c6976c5392ac5023a1f",
  // Tornado Cash — BSC pools
  "0x1e34a77868e19a6647b1f2f47b51ed72dede95dd", // 0.1 BNB
  "0xd47438c816c9e7f2e2888a78dcd59d7cfb8b9d49", // 1 BNB
  "0x330bdfade01ee9bf63c209ee33102dd334618e0a", // 10 BNB
  "0x1e34a77868e19a6647b1f2f47b51ed72dede95dd", // BSC DAI
  // Tornado Cash relayers
  "0x9ad122c22b14202b4490edaf288fdb3c7cb3ff5e",
  // Sinbad.io
  "0x2fc93484614a34f26f7970cbb94422d78a60c4f6",
  // Railgun privacy protocol (Ethereum)
  "0xfa7093cdd9ee6932b4eb2c9e1cde7ce00b1fa4b8",
  "0x00000000219ab540356cbb839cbe05303d7705fa", // Railgun adapt v2
  // Blender.io (first OFAC-sanctioned mixer, May 2022)
  "0xd3f5c31e9da2e5b5f36de0d568fc81fc6ebb88c7",
  "0xab1c342c7bf5ec5f02adea1c2270670bca144cbc",
])

// OFAC SDN-listed crypto addresses (curated subset — update regularly for production use)
// Sources: OFAC SDN list press releases, confirmed via public blockchain explorers
export const OFAC_SANCTIONED_ADDRESSES = new Set([
  // Lazarus Group / DPRK — OFAC SDN April 2022
  "0x098b716b8aaf21512996dc57eb0615e2383e2f96", // Ronin Bridge exploiter ($625M hack)
  "0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b",
  "0x3cffd56b47b7b41c56258d9c7731abadc360e073",
  "0x53b6936513e738f44fb50d2b9476730c0ab3bfc1",
  "0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b",
  "0x7f367cc41522ce07553e823bf3be79a889debe1b",
  "0x901bb9583b24d97e995513c6778dc6888ab6870e",
  "0xa7e5d5a720f06526557c513402f2e6b5fa20b008",
  "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c",
  "0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a",
  "0x7db418b5d567a4e0e8c59ad71be1fce48f3e6107",
  "0x72a5843cc08275c8171e582972aa4fda8c397b2a",
  "0x7f367cc41522ce07553e823bf3be79a889debe1b",
  // Lazarus Group — Harmony Horizon bridge hack
  "0x0d043128146654c7683fbf30ac98d7b2285ded00",
  "0x58e8dcc13be9780fc42e8723d8ead4cf46943df2",
  // OFAC-designated Tornado Cash deployer address
  "0x8589427373d6d84e98730d7795d8f6f8731fda16",
  // Garantex exchange (OFAC SDN April 2022 — Russian exchange)
  "0x6f1ca141a28907f78ebaa64fb83a9088b02a8352",
  "0x3cbded43efdaf0fc77b9c55f6fc9988fcc9b1f73",
])

// Known DeFi protocol contract addresses for interaction quality scoring
export const REPUTABLE_PROTOCOLS = new Set([
  // Uniswap v2/v3
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  "0xe592427a0aece92de3edee1f18e0157c05861564",
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",
  // Aave v2/v3
  "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
  "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2",
  // Compound
  "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b",
  // Lido
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  // Curve
  "0x99a58482bd75cbab83b27ec03ca68ff489b5788f",
  // 1inch
  "0x1111111254eeb25477b68fb85ed929f73a960582",
  // Balancer
  "0xba12222222228d8ba445958a75a0704d566bf2c8",
  // MakerDAO
  "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
])

// Solana: program ID → canonical human-readable name (used to resolve addresses to names,
// preventing double-counting when both senderName and senderAddress match the same protocol)
export const SOLANA_PROGRAM_NAME: Record<string, string> = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "jupiter",
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: "jupiter",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "raydium",
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: "raydium",
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "orca",
  "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP": "orca",
  MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD: "marinade",
  jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL: "jito",
  dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH: "drift",
  KLend2g3cP87fffoy8q1mQqGKjrL9jGHmSeFJ6m6TYA: "kamino",
  LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: "meteora",
  MFv2hWf31Z9kbCa1snEPdcgp168vLs2Z7Cs8SYXNbfe: "meteora",
  So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo: "solend",
  mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68: "mango",
  TSWAPaqyCSx2KABk68Shruf4rp7CxcAi9LVkkawhTc: "tensor",
  M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K: "magic eden",
}

// Solana: known reputable program IDs (derived from the map above)
export const SOLANA_REPUTABLE_PROGRAMS = new Set(Object.keys(SOLANA_PROGRAM_NAME))

// Solana: known risky / privacy program IDs
export const SOLANA_RISKY_PROGRAMS = new Set([
  "elusivmYmBVAD3VWdAUEVBYAMX1WNS7mLjUXerGvfxuv", // Elusiv privacy protocol (defunct)
])

// Solana: reputable protocol names to match against logEvents.senderName (lowercase)
// More reliable than address matching since GoldRush may not map toAddress → program ID
export const SOLANA_REPUTABLE_NAMES = new Set([
  "jupiter", "raydium", "orca", "marinade", "jito",
  "drift", "kamino", "meteora", "solend", "mango",
  "tensor", "magic eden", "lifinity", "phoenix", "zeta",
  "symmetry", "marginfi", "save", "sanctum", "hawksight",
])

// Solana: liquid staking token symbols — balance-based credibility signal
export const SOLANA_STAKING_SYMBOLS = new Set([
  "MSOL", "JITOSOL", "BSOL", "STSOL", "SCNSOL", "LAINESOL", "JSOL",
])
