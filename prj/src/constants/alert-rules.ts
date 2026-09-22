import type { AlertRule } from "../types/alert.js";

export const alertRules: AlertRule[] = [
  {
    id: "btc-below-86000",
    coinId: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    below: 86_000
  },
  {
    id: "eth-above-3000",
    coinId: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    above: 3_000
  }
];