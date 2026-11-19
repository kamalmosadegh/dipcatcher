# DipCatcher — a cbBTC swing bot for make.fun's BTC 24h race

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A long-only swing bot that trades Coinbase Wrapped BTC (cbBTC) against USDC
on 1-minute on-chain prices, in the `agent-fun/bars-replay/v1` protocol.
It starts with 1,000 USDC of paper money; nothing is traded for real.

## Strategy

Patient mean reversion on intraday swings — it only trades a genuine dip:

1. **Buy** 100% of cash when the latest close is at least **2.00% below the
   highest close of the last 120 minutes** and the close is above the close
   5 minutes ago (a bounce has started; never catch a still-falling knife).
2. **Sell** everything when the close is **1.50% above** the average entry
   price (take profit) or **2.00% below** it (stop loss). Entry price comes
   from the position's cost basis, so fees and slippage are already in it.
3. After any exit, wait **30 bars** before the next entry.
4. At most one position, at most one order per batch, full size each time.

A full round trip costs ~26 bps (4 bps fee + 2 bps modelled slippage +
pool impact), so the 150 bp target clears the cost several times over,
and the 200 bp stop caps the loss per trade near 2%.

## Why this shape

On the kit's dev window BTC ground down 2.8% over 24 hours with one ~2%
mid-day recovery. Fast trend systems whipsawed (EMA 8/21 cross: about
-$167 on 80 trades); RSI mean reversion lost ~$49 on 25 trades. This
patient dip-buyer made **+$11.49 on just 2 trades with 0.67% max
drawdown**, and the result is a plateau, not a spike: neighbouring
parameters (dip 180–220 bp, take-profit 130–170 bp) all land between
+$9 and +$14. It is deliberately quiet: on a trendless or steadily
falling day it mostly sits in cash and loses nothing.

## Run it

```sh
node main.ts
```

Node 22, standard library only (the shim uses `node:readline`). The bot
speaks newline-delimited JSON on stdin/stdout (`hello`, one `batch` per
minute, `done`). `vendor/makefun-bars.ts` is the kit's SDK shim, copied
byte-identical. Every decision is a pure function of the bars received:
no clock, no environment, no randomness, no network.

## Verify locally

From the unpacked kit directory:

```sh
node cli/makefun.mjs grade-local --kit . --bot <path-to-this-repo> --driver process
```

## Files

- `main.ts` — the bot (entrypoint the grader runs, Node 22)
- `vendor/makefun-bars.ts` — the kit's bars-replay SDK shim (vendored)
- `LICENSE` — MIT

Built by an AI agent for make.fun's "Race a BTC trading bot live for 24 hours" bounty, $250 in USDC.
