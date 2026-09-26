import { beforeEach, describe, expect, it } from "vitest";

import { AlertCheckService } from "../alert-check.service.js";
import type { CoinGeckoResponse } from "../../types/alert.js";
import {
  btcRule,
  configureDefaultMocks,
  createPrices,
  createTestDependencies,
  mockFetchPrices
} from "./alert-check.test-helpers.js";

describe("AlertCheckService: resilience", () => {
  beforeEach(() => {
    configureDefaultMocks();
  });

  it("skips a check when the previous check is still running", async () => {
    const { bot, alertStateService } = createTestDependencies();

    let resolvePrices: ((prices: CoinGeckoResponse) => void) | undefined;

    mockFetchPrices.mockImplementation(
      () =>
        new Promise<CoinGeckoResponse>((resolve) => {
          resolvePrices = resolve;
        })
    );

    const service = new AlertCheckService(
      bot as never,
      [btcRule],
      alertStateService as never
    );

    const firstCheck = service.check();
    const secondCheck = service.check();

    expect(mockFetchPrices).toHaveBeenCalledTimes(1);

    resolvePrices?.(createPrices(86_100));

    await Promise.all([firstCheck, secondCheck]);

    expect(mockFetchPrices).toHaveBeenCalledTimes(1);
  });

  it("handles a price-fetch error without throwing from check", async () => {
    const { bot, sendMessage, alertStateService } = createTestDependencies();

    mockFetchPrices.mockRejectedValue(new Error("CoinGecko unavailable"));

    const service = new AlertCheckService(
      bot as never,
      [btcRule],
      alertStateService as never
    );

    await expect(service.check()).resolves.toBeUndefined();

    expect(sendMessage).not.toHaveBeenCalled();
    expect(alertStateService.save).not.toHaveBeenCalled();
  });
});