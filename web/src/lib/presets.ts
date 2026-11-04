import { PAIR_LABELS } from './constants'
import type { BotConfig } from './types'

export type PresetConfig = Partial<BotConfig>
export type Risk = 'Prudent' | 'Modéré' | 'Risqué'

/** Presets fournis (issus de backtests 4 h : biais de sélection, résultats optimistes — à observer en paper). */
export const PRESETS: Record<string, PresetConfig> = {
  "a": {
    "pair": "ETHUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "rsi_period": 7,
    "rsi_buy": 30,
    "rsi_sell": 70,
    "take_profit_pct": 4,
    "stop_loss_pct": 2,
    "order_size": 100
  },
  "b": {
    "pair": "ETHUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "rsi_period": 7,
    "rsi_buy": 30,
    "rsi_sell": 70,
    "take_profit_pct": 4,
    "stop_loss_pct": 8,
    "order_size": 100
  },
  "xrp": {
    "pair": "XRPUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "rsi_period": 7,
    "rsi_buy": 25,
    "rsi_sell": 65,
    "take_profit_pct": 2,
    "stop_loss_pct": 8,
    "order_size": 50
  },
  "shib": {
    "pair": "SHIBUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "rsi_period": 7,
    "rsi_buy": 30,
    "rsi_sell": 65,
    "take_profit_pct": 2,
    "stop_loss_pct": 8,
    "order_size": 50
  },
  "sol": {
    "pair": "SOLUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "rsi_period": 14,
    "rsi_buy": 35,
    "rsi_sell": 55,
    "take_profit_pct": 2,
    "stop_loss_pct": 2,
    "order_size": 100
  },
  "avax": {
    "pair": "AVAXUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "rsi_period": 7,
    "rsi_buy": 35,
    "rsi_sell": 65,
    "take_profit_pct": 4,
    "stop_loss_pct": 8,
    "order_size": 100
  },
  "link": {
    "pair": "LINKUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "rsi_period": 7,
    "rsi_buy": 35,
    "rsi_sell": 70,
    "take_profit_pct": 8,
    "stop_loss_pct": 4,
    "order_size": 200
  },
  "avaxr": {
    "pair": "AVAXUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "rsi_period": 7,
    "rsi_buy": 35,
    "rsi_sell": 65,
    "take_profit_pct": 4,
    "stop_loss_pct": 2,
    "order_size": 200
  },
  "btcr": {
    "pair": "XBTUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "strategy": "rsi",
    "rsi_period": 7,
    "rsi_buy": 25,
    "rsi_sell": 70,
    "take_profit_pct": 4,
    "stop_loss_pct": 4,
    "order_size": 100
  },
  "solr": {
    "pair": "SOLUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "strategy": "rsi",
    "rsi_period": 7,
    "rsi_buy": 25,
    "rsi_sell": 65,
    "take_profit_pct": 2,
    "stop_loss_pct": 2,
    "order_size": 100
  },
  "btce": {
    "pair": "XBTUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "strategy": "trend",
    "ma_fast": 8,
    "ma_slow": 50,
    "stop_loss_pct": 3,
    "trailing_pct": 3,
    "order_size": 100
  },
  "sole": {
    "pair": "SOLUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "strategy": "trend",
    "ma_fast": 5,
    "ma_slow": 50,
    "stop_loss_pct": 5,
    "trailing_pct": 0,
    "order_size": 100
  },
  "linke": {
    "pair": "LINKUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "strategy": "trend",
    "ma_fast": 8,
    "ma_slow": 50,
    "stop_loss_pct": 3,
    "trailing_pct": 8,
    "order_size": 100
  },
  "adae": {
    "pair": "ADAUSDC",
    "mode": "paper",
    "timeframe": 240,
    "check_every": 300,
    "strategy": "trend",
    "ma_fast": 8,
    "ma_slow": 50,
    "stop_loss_pct": 3,
    "trailing_pct": 8,
    "order_size": 100
  }
}

export const BUILTIN: [Risk, [string, string][]][] = [
  [
    "Prudent",
    [
      [
        "btcr",
        "RSI · BTC/USDC 4h"
      ],
      [
        "a",
        "RSI · ETH/USDC 4h équilibré"
      ],
      [
        "b",
        "RSI · ETH/USDC 4h patient"
      ],
      [
        "xrp",
        "RSI · XRP/USDC 4h prudent"
      ],
      [
        "shib",
        "RSI · SHIB/USDC 4h prudent"
      ],
      [
        "btce",
        "EMA · BTC/USDC 4h"
      ]
    ]
  ],
  [
    "Modéré",
    [
      [
        "solr",
        "RSI · SOL/USDC 4h"
      ],
      [
        "sol",
        "RSI · SOL/USDC 4h modéré"
      ],
      [
        "avax",
        "RSI · AVAX/USDC 4h modéré"
      ],
      [
        "sole",
        "EMA · SOL/USDC 4h"
      ],
      [
        "linke",
        "EMA · LINK/USDC 4h"
      ]
    ]
  ],
  [
    "Risqué",
    [
      [
        "link",
        "RSI · LINK/USDC 4h risqué"
      ],
      [
        "avaxr",
        "RSI · AVAX/USDC 4h agressif"
      ],
      [
        "adae",
        "EMA · ADA/USDC 4h (volume faible)"
      ]
    ]
  ]
]

export const RISK_COLOR: Record<Risk, string> = { Prudent: 'var(--ok)', 'Modéré': 'var(--ac)', Risqué: 'var(--ko)' }
export const PRESET_NAMES: Record<string, string> = Object.fromEntries(BUILTIN.flatMap(([, items]) => items))

/** Résumé d'une config en une ligne (infobulle des presets). */
export function summarize(c: PresetConfig): string {
  const pair = PAIR_LABELS[c.pair ?? ''] ?? c.pair
  const method =
    c.strategy === 'trend'
      ? `EMA ${c.ma_fast}/${c.ma_slow} · SL ${c.stop_loss_pct}% · suiveur ${c.trailing_pct}%`
      : c.strategy && c.strategy !== 'rsi'
        ? `${c.strategy} · SL ${c.stop_loss_pct}%`
        : `RSI ${c.rsi_period} (${c.rsi_buy}/${c.rsi_sell}) · TP ${c.take_profit_pct}% · SL ${c.stop_loss_pct}%`
  return `${pair} · ${c.timeframe} min · ${method} · ordre ${c.order_size}`
}

/** Preset intégré à charger pour une paire et une méthode : le plus prudent (stop <= 4 %) d'abord. */
export function presetFor(pair: string, strategy: string): [string, PresetConfig] | null {
  const ids = Object.keys(PRESETS).filter((k) => PRESETS[k].pair === pair && (PRESETS[k].strategy ?? 'rsi') === strategy)
  const id = ids.find((k) => (PRESETS[k].stop_loss_pct ?? 99) <= 4) ?? ids[0]
  return id ? [id, PRESETS[id]] : null
}
