import type { Telegraf } from "telegraf";

import { env } from "../config/env.js";
import { createAlertMessage } from "../bot/messages.js";
import { fetchPrices, formatPrice } from "./price.service.js";
import { AlertStateService } from "./alert-state.service.js";
import type { AlertRule } from "../types/alert.js";

export class AlertCheckService {
  private readonly triggeredRuleIds = new Set<string>();
  private isChecking = false;

  public constructor(
    private readonly bot: Telegraf,
    private readonly rules: AlertRule[],
    private readonly alertStateService: AlertStateService
  ) {}

  public async loadState(): Promise<void> {
    const loadedRuleIds = await this.alertStateService.load();

    for (const ruleId of loadedRuleIds) {
      this.triggeredRuleIds.add(ruleId);
    }
  }

  public isRuleTriggered(ruleId: string): boolean {
    return this.triggeredRuleIds.has(ruleId);
  }

  public async check(): Promise<void> {
    if (this.isChecking) {
      console.warn(
        "Skipping price check because the previous check is still running."
      );

      return;
    }

    this.isChecking = true;

    try {
      const coinIds = this.rules.map((rule) => rule.coinId);
      const prices = await fetchPrices(coinIds);

      for (const rule of this.rules) {
        const price = prices[rule.coinId]?.[env.currency];

        if (price === undefined) {
          console.error(
            `No ${env.currency} price returned for ${rule.coinId}.`
          );

          continue;
        }

        const isBelowThreshold =
          rule.below !== undefined && price < rule.below;

        const isAboveThreshold =
          rule.above !== undefined && price > rule.above;

        const isTriggered = isBelowThreshold || isAboveThreshold;

        console.log(
          `[${new Date().toISOString()}] ` +
            `${rule.symbol}=${formatPrice(price)}; ` +
            `triggered=${isTriggered}`
        );

        const wasAlreadyTriggered = this.triggeredRuleIds.has(rule.id);

        if (isTriggered && !wasAlreadyTriggered) {
          const condition = isBelowThreshold
            ? `fell below ${formatPrice(rule.below!)}`
            : `rose above ${formatPrice(rule.above!)}`;

          await this.bot.telegram.sendMessage(
            env.telegramChatId,
            createAlertMessage(rule, formatPrice(price), condition)
          );

          this.triggeredRuleIds.add(rule.id);
          await this.alertStateService.save(this.triggeredRuleIds);

          console.log(`Alert sent for rule: ${rule.id}`);
        }

        if (!isTriggered && wasAlreadyTriggered) {
          this.triggeredRuleIds.delete(rule.id);
          await this.alertStateService.save(this.triggeredRuleIds);

          console.log(`Alert reset for rule: ${rule.id}`);
        }
      }
    } catch (error) {
      console.error("Scheduled price check failed:", error);
    } finally {
      this.isChecking = false;
    }
  }
}