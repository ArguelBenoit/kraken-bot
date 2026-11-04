import { PAIR_LABELS } from './constants'
import type { BotConfig } from './types'

/** Résumé d'une config en une ligne (ex. « BTC/USDC · 240 min · RSI 7 (30/68) · TP 3 % · SL 3 % »). L'ordre n'est affiché que s'il est connu. */
export function summarize(c: Partial<BotConfig>): string {
  const pair = PAIR_LABELS[c.pair ?? ''] ?? c.pair
  const method =
    c.strategy === 'trend'
      ? `EMA ${c.ma_fast}/${c.ma_slow} · SL ${c.stop_loss_pct}% · suiveur ${c.trailing_pct}%`
      : c.strategy && c.strategy !== 'rsi'
        ? `${c.strategy} · SL ${c.stop_loss_pct}%`
        : `RSI ${c.rsi_period} (${c.rsi_buy}/${c.rsi_sell}) · TP ${c.take_profit_pct}% · SL ${c.stop_loss_pct}%`
  return `${pair} · ${c.timeframe} min · ${method}${c.order_size != null ? ` · ordre ${c.order_size}` : ''}`
}
