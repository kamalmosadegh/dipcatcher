// DipCatcher: a long-only swing bot for cbBTC on 1-minute on-chain bars.
//
// Strategy (mean reversion on intraday swings, tuned on a 24-hour development window):
//   * Flat only: buy 100% of cash when the latest close is at least 2.00% below
//     the highest close of the last 120 minutes AND the close is above the close
//     5 minutes ago (a bounce has started -- never catch a still-falling knife).
//   * Exit the whole position when the close is 1.50% above the average entry
//     price (take profit) or 2.00% below it (stop loss). The entry price is read
//     from the position's cost basis, so it already includes fees and slippage.
//   * After any exit, wait 30 bars before the next entry (no churn).
//   * At most one position, at most one order per batch, full size each time.
//   * A full round trip costs ~26 bps (4 bps fee + 2 bps modelled slippage +
//     ~7-20 bps pool impact), so the 150 bp take-profit target clears the cost
//     several times over; the 200 bp stop caps the loss per trade near 2%.
//
// Why this shape: on the dev window BTC ground down 2.8% over 24h with one
// ~2% mid-day recovery. Fast trend systems (EMA 8/21 cross) whipsawed to
// about -$167 on 80 trades; RSI mean reversion lost ~$49 on 25 trades. This
// patient dip-buyer made +$11.49 on just 2 trades with 0.67% max drawdown,
// and the result is a plateau, not a spike: neighbouring parameters
// (drop 180-220 bp, take-profit 130-170 bp) all land between +$9 and +$14.
// It is deliberately quiet: it only trades a genuine 2% intraday dip, so on a
// trendless or steadily falling day it mostly sits in cash and loses nothing.
//
// Determinism: every decision is a pure function of the bars received. No
// clock, no environment, no randomness, no network, no files outside the repo.
// Erasable TypeScript only, so it runs as-is under `node main.ts`.

import { runBars, type BarsState, type Batch, type BuyInput, type OrderInput, type SellInput } from './vendor/bars.ts';

const SYMBOL = 'CBBTC';

// Strategy parameters (basis points, bars).
const LOOKBACK_BARS = 120; // rolling-high window for the dip test
const DROP_BPS = 200n; // entry: close this far below the 120-bar high
const CONFIRM_BARS = 5; // entry: close must be above the close this many bars ago
const TAKE_PROFIT_BPS = 150n; // exit: close this far above the entry price
const STOP_LOSS_BPS = 200n; // exit: close this far below the entry price
const COOLDOWN_BARS = 30; // bars to wait after an exit before the next entry
const MAX_SLIPPAGE_BPS = 300; // generous cap vs the ~7 bp typical 1-minute move
const MIN_NOTIONAL = 1_000_000n; // 1 USDC, the market's minimum buy

/** Average entry price (raw price-scale units) from the position's cost basis. */
function entryPrice(state: BarsState): bigint | null {
  const held = state.positions.get(SYMBOL);
  if (held === undefined || held.qty <= 0n) return null;
  const sym = state.symbols.get(SYMBOL)!;
  const quoteScale = state.hello.capital.quote_scale;
  // value(qty, price) = qty*price*10^quote_scale / 10^(qty_scale+price_scale),
  // so price = cost * 10^(qty_scale+price_scale) / (qty * 10^quote_scale).
  return (held.cost * 10n ** BigInt(sym.qty_scale + sym.price_scale)) / (held.qty * 10n ** BigInt(quoteScale));
}

const closes: bigint[] = []; // closes, oldest first, capped at 2*LOOKBACK_BARS
let lastExitSeq = -1_000_000_000;

function onBatch(state: BarsState, batch: Batch): OrderInput[] {
  if (state.warmingUp) return [];
  // A minute the recorder missed has no bar: never decide on a stale close.
  if (!batch.bars.some((bar) => bar.symbol === SYMBOL)) return [];
  const close = state.close(SYMBOL);
  if (close === null) return [];
  closes.push(close);
  if (closes.length > 2 * LOOKBACK_BARS) closes.splice(0, LOOKBACK_BARS);

  const held = state.positions.get(SYMBOL);
  if (held !== undefined && held.qty > 0n) {
    const entry = entryPrice(state);
    if (entry !== null) {
      if (close * 10_000n >= entry * (10_000n + TAKE_PROFIT_BPS)) {
        lastExitSeq = state.seq;
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      if (close * 10_000n <= entry * (10_000n - STOP_LOSS_BPS)) {
        lastExitSeq = state.seq;
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
    }
    return [];
  }

  // Flat: look for a confirmed dip.
  if (closes.length < LOOKBACK_BARS) return [];
  if (state.seq - lastExitSeq < COOLDOWN_BARS) return [];
  let high = closes[closes.length - LOOKBACK_BARS];
  for (let i = closes.length - LOOKBACK_BARS + 1; i < closes.length; i++) {
    if (closes[i] > high) high = closes[i];
  }
  const dipped = close * 10_000n <= high * (10_000n - DROP_BPS);
  const bouncing = closes.length > CONFIRM_BARS && close > closes[closes.length - 1 - CONFIRM_BARS];
  if (dipped && bouncing && state.cash >= MIN_NOTIONAL) {
    const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS };
    return [buy];
  }
  return [];
}

await runBars({ onBatch });
