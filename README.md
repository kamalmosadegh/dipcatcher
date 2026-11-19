# 📉 DipCatcher — Algorithmic Bitcoin Trading Bot

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Strategy](https://img.shields.io/badge/strategy-dip%20buying-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-completed-brightgreen)

A patient, rules-based BTC trading bot: it does nothing most of the time — and strikes only when price confirms a real dip. Built to compete in a 24-hour live trading race: enter rarely, protect capital first.

## 📊 Official dev grading

| Metric | Result |
|---|---|
| Net PnL | **+$13.67 USDC** |
| Win rate | **100%** (2 / 2 trades) |
| Max drawdown | **0.67%** |
| Kit checks | 16 / 16 passed |

## 🧠 Strategy
- **Entry:** limit buy when price closes ≥ 2% below the 120-bar high, confirmed by a green candle closing in its top half after ≥ 3 red candles (capitulation + first reversal).
- **Take profit:** +1.5% · **Stop loss:** −2% (hard guardrails, no discretion).
- **Cooldown:** 30 bars between trades — no revenge trading, no overtrading.
- **Sizing:** 50% of equity per trade.

## 🚀 Run
```bash
# entrypoint: main.ts — strategy(config) over 1-minute bars
```
The strategy function is deterministic and side-effect free: same bars in, same orders out.

## 👤 Author
**Kamal Mosadegh** — freelance developer · [Portfolio](https://kamalmosadegh.github.io) · kamalmosadegh6977@gmail.com

MIT licensed.
