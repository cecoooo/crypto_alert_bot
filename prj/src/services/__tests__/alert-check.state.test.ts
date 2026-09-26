import { beforeEach, describe, expect, it } from "vitest";

import { AlertCheckService } from "../alert-check.service.js";
import {
  btcRule,
  configureDefaultMocks,
  createPrices,
  createTestDependencies,
  mockFetchPrices
} from "./alert-check.test-helpers.js";

describe("AlertCheckService: state transitions", () => {
  beforeEach(() => {
    configureDefaultMocks();
  });

  it("resets BTC state when BTC recovers above the threshold", async () => {
    const { bot, sendMessage, alertStateService } = createTestDependencies();

    mockFetchPrices
      .mockResolvedValueOnce(createPrices(85_900))
      .mockResolvedValueOnce(createPrices(86_100));

    const service = new AlertCheckService(
      bot as never,
      [btcRule],
      alertStateService as never
    );

    await service.check();
    await service.check();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(alertStateService.save).toHaveBeenCalledTimes(2);
    expect(service.isRuleTriggered(btcRule.id)).toBe(false);

    const resetState = alertStateService.save.mock.calls[1]?.[0] as Set<string>;

    expect(resetState).toEqual(new Set());
  });

  it("sends a new BTC alert after reset and a later second drop", async () => {
    const { bot, sendMessage, alertStateService } = createTestDependencies();

    mockFetchPrices
      .mockResolvedValueOnce(createPrices(85_900))
      .mockResolvedValueOnce(createPrices(86_100))
      .mockResolvedValueOnce(createPrices(85_800));

    const service = new AlertCheckService(
      bot as never,
      [btcRule],
      alertStateService as never
    );

    await service.check();
    await service.check();
    await service.check();

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(alertStateService.save).toHaveBeenCalledTimes(3);
    expect(service.isRuleTriggered(btcRule.id)).toBe(true);
  });

  it("does not persist state while a rule remains normal", async () => {
    const { bot, sendMessage, alertStateService } = createTestDependencies();

    mockFetchPrices.mockResolvedValue(createPrices(86_100));

    const service = new AlertCheckService(
      bot as never,
      [btcRule],
      alertStateService as never
    );

    await service.check();

    expect(sendMessage).not.toHaveBeenCalled();
    expect(alertStateService.save).not.toHaveBeenCalled();
    expect(service.isRuleTriggered(btcRule.id)).toBe(false);
  });

  it("loads persistent triggered state", async () => {
    const { bot, alertStateService } = createTestDependencies();

    alertStateService.load.mockResolvedValue(new Set([btcRule.id]));

    const service = new AlertCheckService(
      bot as never,
      [btcRule],
      alertStateService as never
    );

    await service.loadState();

    expect(alertStateService.load).toHaveBeenCalledTimes(1);
    expect(service.isRuleTriggered(btcRule.id)).toBe(true);
  });
});