import { env } from "../config/env.js";
import type { CoinGeckoResponse } from "../types/alert.js";

const coinGeckoApiUrl = "https://api.coingecko.com/api/v3/simple/price";

export async function fetchPrices(
  coinIds: string[]
): Promise<CoinGeckoResponse> {
  const url = new URL(coinGeckoApiUrl);

  url.searchParams.set("ids", coinIds.join(","));
  url.searchParams.set("vs_currencies", env.currency);

  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(
      `CoinGecko request failed: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as CoinGeckoResponse;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: env.currency.toUpperCase(),
    maximumFractionDigits: 2
  }).format(price);
}