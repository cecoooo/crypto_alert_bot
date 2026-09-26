import { beforeEach, describe, expect, it } from "vitest";

import { AlertCheckService } from "../alert-check.service.js";
import {
  btcRule,
  configureDefaultMocks,
  createPrices,
  createTestDependencies,
  ethRule,
  mockCreateAlertMessage,
  mockFetchPrices
} from "./alert-check.test-helpers.js";

describe("AlertCheckService: triggering", () => {
  beforeEach(() => {
    configureDefaultMocks();
  });

  it("sends and persists the first BTC below-threshold alert", async () => {
    const { bot, sendMessage, alertStateService } = createTestDependencies();

    mockFetchPrices.mockResolvedValue(createPrices(85_900));

    const service = new AlertCheckService(
      bot as never,
      [btcRule],
      alertStateService as never
    );

    await service.check();

    expect(mockFetchPrices).toHaveBeenCalledWith(["bitcoin"]);
    expect(mockCreateAlertMessage).toHaveBeenCalledWith(
      btcRule,
      "$85900.00",
      "fell below $86000.00"
    );
    expect(sendMessage).toHaveBeenCalledWith(
      "123456789",
      "BTC: fell below $86000.00; current=$85900.00"
    );
    expect(alertStateService.save).toHaveBeenCalledTimes(1);
    expect(service.isRuleTriggered(btcRule.id)).toBe(true);
  });

  it("does not send a duplicate BTC alert while BTC remains below the threshold", async () => {
    const { bot, sendMessage, alertStateService } = createTestDependencies();

    mockFetchPrices
      .mockResolvedValueOnce(createPrices(85_900))
      .mockResolvedValueOnce(createPrices(85_700));

    const service = new AlertCheckService(
      bot as never,
      [btcRule],
      alertStateService as never
    );

    await service.check();
    await service.check();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(alertStateService.save).toHaveBeenCalledTimes(1);
    expect(service.isRuleTriggered(btcRule.id)).toBe(true);
  });

  it("sends an ETH alert when ETH rises above its threshold", async () => {
    const { bot, sendMessage, alertStateService } = createTestDependencies();

    mockFetchPrices.mockResolvedValue(createPrices(84_000, 3_001));

    const service = new AlertCheckService(
      bot as never,
      [ethRule],
      alertStateService as never
    );

    await service.check();

    expect(mockFetchPrices).toHaveBeenCalledWith(["ethereum"]);
    expect(mockCreateAlertMessage).toHaveBeenCalledWith(
      ethRule,
      "$3001.00",
      "rose above $3000.00"
    );
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(alertStateService.save).toHaveBeenCalledTimes(1);
    expect(service.isRuleTriggered(ethRule.id)).toBe(true);
  });
});