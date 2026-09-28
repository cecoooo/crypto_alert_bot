import { Telegraf } from "telegraf";

import { registerBotCommands } from "./bot/commands.js";
import { env } from "./config/env.js";
import { alertRules } from "./constants/alert-rules.js";
import { postgresPool } from "./db/postgres.js";
import { runMigrations } from "./db/migrate.js";
import { startPriceCheckScheduler } from "./scheduler/price-check.scheduler.js";
import { AlertCheckService } from "./services/alert-check.service.js";
import { PostgresAlertStateStore } from "./services/postgres-alert-state.store.js";

const bot = new Telegraf(env.telegramBotToken);

const alertStateStore = new PostgresAlertStateStore(postgresPool);

const alertCheckService = new AlertCheckService(
  bot,
  alertRules,
  alertStateStore
);

registerBotCommands(bot, alertRules, alertCheckService);

async function shutdown(signal: "SIGINT" | "SIGTERM"): Promise<void> {
  bot.stop(signal);
  await postgresPool.end();
}

async function start(): Promise<void> {
  await runMigrations(postgresPool);
  await alertCheckService.loadState();

  void bot.launch(() => {
    console.log("Telegram bot started.");

    startPriceCheckScheduler(alertCheckService);
  });
}

void start();

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));