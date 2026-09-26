import { vi } from "vitest";

import { createAlertMessage } from "../../bot/messages.js";
import { fetchPrices, formatPrice } from "../price.service.js";
import type { AlertRule, CoinGeckoResponse } from "../../types/alert.js";

export const mockFetchPrices = vi.mocked(fetchPrices);
export const mockFormatPrice = vi.mocked(formatPrice);
export const mockCreateAlertMessage = vi.mocked(createAlertMessage);

export const btcRule: AlertRule = {
  id: "btc-below-86000",
  coinId: "bitcoin",
  symbol: "BTC",
  name: "Bitcoin",
  below: 86_000
};

export const ethRule: AlertRule = {
  id: "eth-above-3000",
  coinId: "ethereum",
  symbol: "ETH",
  name: "Ethereum",
  above: 3_000
};

export function createPrices(
  bitcoinPrice: number,
  ethereumPrice = 2_700
): CoinGeckoResponse {
  return {
    bitcoin: { usd: bitcoinPrice },
    ethereum: { usd: ethereumPrice }
  };
}

export function createTestDependencies() {
  const sendMessage = vi.fn().mockResolvedValue(undefined);

  const bot = {
    telegram: {
      sendMessage
    }
  };

  const alertStateService = {
    load: vi.fn().mockResolvedValue(new Set<string>()),
    save: vi.fn().mockResolvedValue(undefined)
  };

  return {
    bot,
    sendMessage,
    alertStateService
  };
}

export function configureDefaultMocks(): void {
  mockFormatPrice.mockImplementation(
    (price: number) => `$${price.toFixed(2)}`
  );

  mockCreateAlertMessage.mockImplementation(
    (rule: AlertRule, price: string, condition: string) =>
      `${rule.symbol}: ${condition}; current=${price}`
  );
}