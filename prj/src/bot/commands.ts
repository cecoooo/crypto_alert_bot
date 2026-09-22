import type { Telegraf } from "telegraf";

import {
  createPriceMessage,
  createStartMessage,
  createStatusMessage
} from "./messages.js";
import { env } from "../config/env.js";
import { fetchPrices, formatPrice } from "../services/price.service.js";
import type { AlertCheckService } from "../services/alert-check.service.js";
import type { AlertRule } from "../types/alert.js";

export function registerBotCommands(
  bot: Telegraf,
  rules: AlertRule[],
  alertCheckService: AlertCheckService
): void {
  bot.start(async (ctx) => {
    await ctx.reply(createStartMessage());
  });

  bot.command("ping", async (ctx) => {
    await ctx.reply("pong");
  });

  bot.command("price", async (ctx) => {
    try {
      const coinIds = rules.map((rule) => rule.coinId);
      const prices = await fetchPrices(coinIds);

      const bitcoinPrice = prices.bitcoin?.[env.currency];
      const ethereumPrice = prices.ethereum?.[env.currency];

      if (bitcoinPrice === undefined || ethereumPrice === undefined) {
        throw new Error("CoinGecko response is missing BTC or ETH price.");
      }

      await ctx.reply(
        createPriceMessage(
          formatPrice(bitcoinPrice),
          formatPrice(ethereumPrice)
        )
      );
    } catch (error) {
      console.error("Failed to handle /price:", error);

      await ctx.reply(
        "Unable to fetch crypto prices right now. Please try again shortly."
      );
    }
  });

  bot.command("status", async (ctx) => {
    const statusLines = rules.map((rule) => {
      const condition =
        rule.below !== undefined
          ? `below ${formatPrice(rule.below)}`
          : `above ${formatPrice(rule.above!)}`;

      const state = alertCheckService.isRuleTriggered(rule.id)
        ? "TRIGGERED"
        : "normal";

      return `${rule.symbol}: ${condition} — ${state}`;
    });

    await ctx.reply(createStatusMessage(statusLines));
  });
}