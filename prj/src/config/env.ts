import "dotenv/config";
import cron from "node-cron";

import type { Currency } from "../types/alert.js";

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} in .env`);
  }

  return value;
}

const cronExpression = process.env.PRICE_CHECK_CRON ?? "*/2 * * * *";

if (!cron.validate(cronExpression)) {
  throw new Error(`Invalid PRICE_CHECK_CRON: ${cronExpression}`);
}

export const env = {
  telegramBotToken: requireEnvironmentVariable("TELEGRAM_BOT_TOKEN"),
  telegramChatId: requireEnvironmentVariable("TELEGRAM_CHAT_ID"),
  cronExpression,
  currency: (process.env.COINGECKO_VS_CURRENCY ?? "usd") as Currency
} as const;