export type Currency = "usd";

export interface CoinGeckoPrice {
  usd: number;
}

export type CoinGeckoResponse = Record<string, CoinGeckoPrice>;

export interface AlertRule {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  below?: number;
  above?: number;
}