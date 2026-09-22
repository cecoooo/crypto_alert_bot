import { Telegraf } from "telegraf";

import { registerBotCommands } from "./bot/commands.js";
import { env } from "./config/env.js";
import { alertRules } from "./constants/alert-rules.js";
import { startPriceCheckScheduler } from "./scheduler/price-check.scheduler.js";
import { AlertCheckService } from "./services/alert-check.service.js";
import { AlertStateService } from "./services/alert-state.service.js";

const bot = new Telegraf(env.telegramBotToken);

const alertStateService = new AlertStateService();

const alertCheckService = new AlertCheckService(
  bot,
  alertRules,
  alertStateService
);

registerBotCommands(bot, alertRules, alertCheckService);

async function start(): Promise<void> {
  await alertCheckService.loadState();

  void bot.launch(() => {
    console.log("Telegram bot started.");

    startPriceCheckScheduler(alertCheckService);
  });
}

void start();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));