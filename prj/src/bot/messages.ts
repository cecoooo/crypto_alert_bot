import type { AlertRule } from "../types/alert.js";

export function createStartMessage(): string {
  return [
    "Crypto Alert Bot is running.",
    "",
    "Commands:",
    "/price - show current BTC and ETH prices",
    "/status - show alert rules and current state"
  ].join("\n");
}

export function createPriceMessage(
  bitcoinPrice: string,
  ethereumPrice: string
): string {
  return [
    "💰 Current prices",
    "",
    `BTC: ${bitcoinPrice}`,
    `ETH: ${ethereumPrice}`
  ].join("\n");
}

export function createAlertMessage(
  rule: AlertRule,
  price: string,
  condition: string
): string {
  return [
    "🚨 Price alert",
    "",
    `${rule.name} (${rule.symbol}) ${condition}.`,
    `Current price: ${price}`,
    `Time: ${new Date().toISOString()}`
  ].join("\n");
}

export function createStatusMessage(
  statusLines: string[]
): string {
  return ["⚙️ Alert status", "", ...statusLines].join("\n");
}