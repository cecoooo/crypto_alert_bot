import cron from "node-cron";

import { env } from "../config/env.js";
import type { AlertCheckService } from "../services/alert-check.service.js";

export function startPriceCheckScheduler(
  alertCheckService: AlertCheckService
): void {
  console.log(`Scheduled price check: ${env.cronExpression}`);

  void alertCheckService.check();

  cron.schedule(env.cronExpression, () => {
    void alertCheckService.check();
  });
}