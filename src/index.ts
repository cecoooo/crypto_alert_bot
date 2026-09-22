import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { Telegraf } from "telegraf";
import cron from "node-cron";

type Currency = "usd";

interface CoinGeckoPrice {
  usd: number;
}

type CoinGeckoResponse = Record<string, CoinGeckoPrice>;
interface AlertRule {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  below?: number;
  above?: number;
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const currency = (process.env.COINGECKO_VS_CURRENCY ?? "usd") as Currency;
const cronExpression = process.env.PRICE_CHECK_CRON ?? "*/2 * * * *";
const chatId = process.env.TELEGRAM_CHAT_ID ?? "";

if (!token) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN in .env");
}
if (!chatId) {
  throw new Error("Missing TELEGRAM_CHAT_ID in .env");
}

const bot = new Telegraf(token);
const rules: AlertRule[] = [
  {
    id: "btc-below-86000",
    coinId: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    below: 86_000
  },
  {
    id: "eth-above-3000",
    coinId: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    above: 3_000
  }
];
const triggeredRuleIds = new Set<string>();
const stateDirectory = path.join(process.cwd(), "data");
const stateFilePath = path.join(stateDirectory, "alert-state.json");

async function fetchPrices(): Promise<CoinGeckoResponse> {
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");

  url.searchParams.set("ids", "bitcoin,ethereum");
  url.searchParams.set("vs_currencies", currency);

  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(
      `CoinGecko request failed: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as CoinGeckoResponse;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2
  }).format(price);
}

async function loadAlertState(): Promise<void> {
  try {
    const content = await readFile(stateFilePath, "utf8");
    const savedRuleIds = JSON.parse(content) as string[];

    for (const ruleId of savedRuleIds) {
      triggeredRuleIds.add(ruleId);
    }

    console.log(`Loaded ${savedRuleIds.length} triggered alert state(s).`);
  } catch (error) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;

    if (errorCode === "ENOENT") {
      console.log("No previous alert state file found. Starting with empty state.");
      return;
    }

    console.error("Failed to load alert state:", error);
  }
}

async function saveAlertState(): Promise<void> {
  try {
    await mkdir(stateDirectory, { recursive: true });

    const savedRuleIds = [...triggeredRuleIds];

    await writeFile(
      stateFilePath,
      JSON.stringify(savedRuleIds, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("Failed to save alert state:", error);
  }
}

async function sendAlert(rule: AlertRule, price: number): Promise<void> {
  const condition =
    rule.below !== undefined && price < rule.below
      ? `fell below ${formatPrice(rule.below)}`
      : `rose above ${formatPrice(rule.above!)}`;

  const message = [
    "🚨 Price alert",
    "",
    `${rule.name} (${rule.symbol}) ${condition}.`,
    `Current price: ${formatPrice(price)}`,
    `Time: ${new Date().toISOString()}`
  ].join("\n");

  await bot.telegram.sendMessage(chatId, message);
}

async function checkAlertRules(): Promise<void> {
  try {
    const prices = await fetchPrices();

    for (const rule of rules) {
      const price = prices[rule.coinId]?.[currency];

      if (price === undefined) {
        console.error(`No ${currency} price returned for ${rule.coinId}.`);
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
      
      const wasAlreadyTriggered = triggeredRuleIds.has(rule.id);

      if (isTriggered && !wasAlreadyTriggered) {
        await sendAlert(rule, price);
        triggeredRuleIds.add(rule.id);  
        await saveAlertState();
        console.log(`Alert sent for rule: ${rule.id}`);
      }  
      if (!isTriggered && wasAlreadyTriggered) {
        triggeredRuleIds.delete(rule.id);  
        await saveAlertState();
        console.log(`Alert reset for rule: ${rule.id}`);
      }

    }
  } catch (error) {
    console.error("Scheduled price check failed:", error);
  }
}

bot.start(async (ctx) => {
  await ctx.reply(
    "Crypto Alert Bot is running.\n\n" +
  "Commands:\n" +
  "/price - show current BTC and ETH prices\n" +
  "/status - show alert rules and current state"
  );
});

bot.command("ping", async (ctx) => {
  await ctx.reply("pong");
});

bot.command("price", async (ctx) => {
  try {
    const prices = await fetchPrices();

    const bitcoinPrice = prices.bitcoin?.[currency];
    const ethereumPrice = prices.ethereum?.[currency];

    if (bitcoinPrice === undefined || ethereumPrice === undefined) {
      throw new Error("CoinGecko response is missing BTC or ETH price.");
    }

    await ctx.reply(
      [
        "💰 Current prices",
        "",
        `BTC: ${formatPrice(bitcoinPrice)}`,
        `ETH: ${formatPrice(ethereumPrice)}`
      ].join("\n")
    );
  } catch (error) {
    console.error("Failed to handle /price:", error);

    await ctx.reply(
      "Unable to fetch crypto prices right now. Please try again shortly."
    );
  }
});

bot.command("status", async (ctx) => {
  const lines = rules.map((rule) => {
    const condition =
      rule.below !== undefined
        ? `below ${formatPrice(rule.below)}`
        : `above ${formatPrice(rule.above!)}`;

    const state = triggeredRuleIds.has(rule.id) ? "TRIGGERED" : "normal";

    return `${rule.symbol}: ${condition} — ${state}`;
  });

  await ctx.reply(`⚙️ Alert status\n\n${lines.join("\n")}`);
});

async function start(): Promise<void> {
  await loadAlertState();

  void bot.launch(() => {
    console.log("Telegram bot started.");
    console.log(`Scheduled price check: ${cronExpression}`);

    void checkAlertRules();

    cron.schedule(cronExpression, () => {
      void checkAlertRules();
    });
  });
}

void start();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));