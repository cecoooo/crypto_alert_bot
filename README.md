# Crypto Alert Bot

A single-chat Telegram bot written in TypeScript that monitors cryptocurrency prices through the CoinGecko API and sends threshold-based alerts. The application runs locally or in Docker, schedules checks with `node-cron`, and persists alert state to avoid duplicate notifications after a restart.

> **MVP scope:** one Telegram chat, BTC and ETH monitoring, and source-code-defined price rules.

## Project layout

```text
crypto_alert_bot/
├── prj/                              # Application source, configuration, and Docker files
│   ├── src/
│   │   ├── index.ts
│   │   ├── bot/
│   │   │   ├── commands.ts
│   │   │   └── messages.ts
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── constants/
│   │   │   └── alert-rules.ts
│   │   ├── scheduler/
│   │   │   └── price-check.scheduler.ts
│   │   ├── services/
│   │   │   ├── alert-check.service.ts
│   │   │   ├── alert-state.service.ts
│   │   │   └── price.service.ts
│   │   └── types/
│   │       └── alert.ts
│   ├── data/                         # Runtime alert state; generated and not committed
│   ├── .dockerignore
│   ├── .env                          # Local secrets; never commit
│   ├── .env.example
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
├── .gitignore
├── LICENSE
└── README.md
```

All commands below assume you run them from the repository root, unless stated otherwise. Application commands must be executed inside `prj/` because that directory contains `package.json`, `.env`, `Dockerfile`, and `docker-compose.yml`.

## Features

- Tracks Bitcoin (`BTC`) and Ethereum (`ETH`) against USD through CoinGecko.
- Sends a Telegram alert when BTC falls below 86,000 USD.
- Sends a Telegram alert when ETH rises above 3,000 USD.
- Fetches all tracked cryptocurrency prices in one CoinGecko request.
- Runs an immediate check when the bot starts, then recurring checks every two minutes by default.
- Prevents duplicate alerts while a threshold remains triggered.
- Persists triggered rule IDs in `prj/data/alert-state.json`.
- Restores anti-spam state after an application or Docker container restart.
- Prevents overlapping asynchronous price checks.
- Provides `/start`, `/ping`, `/price`, and `/status` Telegram commands.
- Uses Docker Compose with a persistent volume and `restart: unless-stopped`.

## Architecture

```text
Telegram user
     │
     ├── /start, /ping, /price, /status
     ▼
Telegraf command handlers
     │
     ├──────────────────────────────┐
     ▼                              ▼
Price service                  Alert check service
CoinGecko API                  threshold evaluation
                                      │
                                      ├── Telegram notification
                                      ├── anti-spam in-memory state
                                      └── JSON state persistence
                                             │
                                             ▼
                              prj/data/alert-state.json

node-cron scheduler ──> Alert check service
```

## Tech stack

| Technology | Purpose |
|---|---|
| Node.js | Application runtime |
| TypeScript | Static typing and safer refactoring |
| Telegraf | Telegram Bot API framework |
| CoinGecko API | Cryptocurrency price data |
| node-cron | Recurring price-check scheduling |
| dotenv | Loading values from `.env` |
| Docker | Packaging the application and runtime |
| Docker Compose | Service startup, environment configuration, persistence, and restart policy |

## Module responsibilities

| Module | Responsibility |
|---|---|
| `prj/src/index.ts` | Application composition, startup, and graceful shutdown hooks |
| `prj/src/config/env.ts` | Loads `.env` and validates required configuration |
| `prj/src/constants/alert-rules.ts` | Defines tracked cryptocurrencies and threshold rules |
| `prj/src/types/alert.ts` | Shared TypeScript types |
| `prj/src/services/price.service.ts` | Fetches and formats CoinGecko price data |
| `prj/src/services/alert-state.service.ts` | Loads and saves triggered rule IDs in JSON storage |
| `prj/src/services/alert-check.service.ts` | Evaluates rules, controls anti-spam behavior, sends alerts, avoids overlap |
| `prj/src/bot/messages.ts` | Creates user-facing Telegram messages |
| `prj/src/bot/commands.ts` | Registers Telegram command handlers |
| `prj/src/scheduler/price-check.scheduler.ts` | Runs immediate and cron-based checks |

## Prerequisites

Install the following:

- Node.js 20 or later
- npm
- A Telegram account
- A bot token created through `@BotFather`
- Docker Desktop with Docker Compose, if you plan to use Docker

## Telegram setup

### Create a bot

1. Open Telegram and find `@BotFather`.
2. Send `/newbot` and follow the prompts.
3. Copy the generated bot token.
4. Open your new bot and send `/start`.

Keep the token secret. Anyone holding it can control the bot.

### Find your chat ID

The MVP sends automatic alerts to one configured numeric chat ID.

1. Open `@userinfobot` in Telegram.
2. Start a chat with it.
3. Copy the numeric value shown after `Id:`.

Do not commit, publish, or share the bot token or chat ID.

## Configuration

Enter the application directory:

```bash
cd prj
```

Copy the example configuration file:

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS, Linux, or Git Bash:

```bash
cp .env.example .env
```

Then edit `prj/.env`:

```env
TELEGRAM_BOT_TOKEN=your_real_telegram_bot_token
TELEGRAM_CHAT_ID=your_numeric_telegram_chat_id

PRICE_CHECK_CRON=*/2 * * * *
COINGECKO_VS_CURRENCY=usd
```

| Variable | Required | Default | Description |
|---|---:|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | — | Token received from `@BotFather` |
| `TELEGRAM_CHAT_ID` | Yes | — | Numeric Telegram chat ID that receives automatic alerts |
| `PRICE_CHECK_CRON` | No | `*/2 * * * *` | Cron expression for scheduled checks |
| `COINGECKO_VS_CURRENCY` | No | `usd` | Quote currency used by this MVP |

### Cron examples

| Expression | Meaning |
|---|---|
| `*/1 * * * *` | Every minute |
| `*/2 * * * *` | Every two minutes |
| `*/5 * * * *` | Every five minutes |
| `0 * * * *` | At the start of every hour |

## Alert rules

Rules are currently configured in:

```text
prj/src/constants/alert-rules.ts
```

Current rules:

```ts
export const alertRules: AlertRule[] = [
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
```

After changing a threshold, rebuild/restart the container:

```bash
cd prj
docker compose up -d --build
```

## Local development

All commands in this section run from `prj/`.

### Install dependencies

```bash
cd prj
npm install
```

### Type-check the project

```bash
npm run check
```

### Run in development mode

```bash
npm run dev
```

Development mode uses `tsx watch` and restarts the app when TypeScript files change.

### Run once

```bash
npx tsx src/index.ts
```

Run only one bot instance at a time. Stop a local instance with `Ctrl + C` before starting Docker, otherwise two processes using the same bot token may compete for Telegram updates.

## Telegram commands

| Command | Result |
|---|---|
| `/start` | Shows the bot introduction and supported commands |
| `/ping` | Replies with `pong` |
| `/price` | Fetches and displays the current BTC and ETH prices |
| `/status` | Displays threshold configuration and in-memory alert state |

Example `/price` response:

```text
💰 Current prices

BTC: $86,245.00
ETH: $2,748.43
```

Example `/status` response:

```text
⚙️ Alert status

BTC: below $86,000.00 — normal
ETH: above $3,000.00 — normal
```

## Alert and state behavior

An alert is sent only when a rule transitions from **normal** to **triggered**. The bot does not send a notification on every scheduled check while the price remains beyond the same threshold.

Example for BTC:

1. BTC is 86,500 USD: `BTC below 86,000 USD` is normal.
2. BTC falls to 85,900 USD: one alert is sent and `btc-below-86000` is marked triggered.
3. BTC remains at 85,700 USD: no duplicate alert is sent.
4. BTC rises to 86,100 USD: the rule resets to normal.
5. BTC later falls to 85,800 USD: a new alert is sent.

### Persistent state

The application saves triggered rule IDs in:

```text
prj/data/alert-state.json
```

Example:

```json
[
  "btc-below-86000"
]
```

If the file does not exist, the bot starts with an empty state. The file is written only when a rule becomes triggered or returns to normal. This prevents a duplicate notification after a restart while a threshold is still breached.

### Overlap protection

A price request is asynchronous. If a check is still running when the next cron tick occurs, the `isChecking` guard skips the new check. This prevents concurrent state writes and reduces duplicate-alert risk.

## Docker

The Docker configuration lives in `prj/`, so enter that directory first:

```bash
cd prj
```

### Build and start

```bash
docker compose up -d --build
```

### Check status

```bash
docker compose ps
```

Expected service state:

```text
crypto-alert-bot   crypto-alert-bot:latest   ...   Up
```

### View logs

Follow logs:

```bash
docker compose logs -f
```

View recent logs:

```bash
docker compose logs --tail=50
```

Typical startup logs:

```text
No previous alert state file found. Starting with empty state.
Telegram bot started.
Scheduled price check: */2 * * * *
[2026-09-22T21:16:50.932Z] BTC=$86,253.00; triggered=false
[2026-09-22T21:16:50.937Z] ETH=$2,747.96; triggered=false
```

### Restart or stop

```bash
# Restart the service
docker compose restart

# Stop and remove the container and Compose network
docker compose down
```

### Persistence and restart policy

The Compose configuration mounts local application data into the container and configures `restart: unless-stopped`.

PowerShell commands from `prj/`:

```powershell
# Verify the restart policy
docker inspect -f "{{.HostConfig.RestartPolicy.Name}}" crypto-alert-bot

# Verify the persistent state mount
docker inspect -f "{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}" crypto-alert-bot
```

Expected values include:

```text
unless-stopped
...[0m -> /app/data
```

## Docker command reference

Run these from `prj/`.

| Command | Purpose |
|---|---|
| `docker compose up -d --build` | Rebuild from current source and start in the background |
| `docker compose up -d` | Start with the existing Docker image |
| `docker compose ps` | Show container status |
| `docker compose logs -f` | Follow application logs |
| `docker compose logs --tail=50` | Show recent logs |
| `docker compose restart` | Restart the service |
| `docker compose down` | Stop and remove the service container |
| `docker compose config --quiet` | Validate Compose configuration without printing configuration values |

## Validation checklist

### TypeScript build check

```bash
cd prj
npm run check
```

Expected: the command exits with no TypeScript errors.

### Local runtime test

```bash
cd prj
npx tsx src/index.ts
```

Expected:

- `Telegram bot started.` appears in the terminal.
- A BTC and ETH price check runs immediately.
- `/ping`, `/price`, and `/status` work in Telegram.

Press `Ctrl + C` to stop the process after testing.

### Docker runtime test

```bash
cd prj
docker compose up -d --build
docker compose ps
docker compose logs --tail=50
```

Expected:

- The container is `Up`.
- No `Error`, `Unhandled`, `Cannot find module`, or TypeScript runtime error appears.
- BTC and ETH price checks appear in logs.
- Telegram commands work.

### Anti-spam persistence test

1. Temporarily configure a threshold that is certain to trigger.
2. Start the bot and confirm that exactly one alert arrives.
3. Confirm that `prj/data/alert-state.json` contains the relevant rule ID.
4. Restart the local process or Docker container.
5. Confirm that no duplicate alert arrives while the rule remains triggered.
6. Restore the intended threshold and remove any test state if needed.

## Security

- Do not commit `prj/.env`.
- Do not expose a real Telegram token in screenshots, logs, tickets, issues, or messages.
- If a token is exposed, revoke it through `@BotFather` and replace it immediately.
- Do not commit `prj/data/` because it contains operational state.
- Use a separate Telegram token for this project.

The root `.gitignore` should cover project-local files despite the nested structure:

```gitignore
prj/node_modules/
prj/dist/
prj/.env
prj/data/
```

## Limitations

- One configured Telegram chat only.
- Alert rules are stored in source code.
- The current MVP is configured for USD only.
- `/price` is intentionally focused on BTC and ETH.
- JSON persistence is designed for one process/container, not horizontally scaled replicas.
- Automated tests have not yet been added.
- There is no HTTP health endpoint or monitoring integration.
- CoinGecko availability and rate limits can affect price retrieval.

## Next improvements

1. Add unit tests for rule evaluation, anti-spam behavior, resets, and state loading.
2. Move thresholds to `.env`, a database, or Telegram management commands.
3. Replace JSON state with SQLite, PostgreSQL, or Redis for multi-instance deployment.
4. Support more assets and dynamically generate the `/price` response from configured rules.
5. Add `/help` and Telegram command metadata.
6. Add structured logs with Pino.
7. Add retry and exponential backoff logic for transient CoinGecko errors.
8. Add a health endpoint and external uptime monitoring.
9. Add ESLint, Prettier, and automated tests.
10. Add a GitHub Actions workflow for checks, tests, and Docker builds.
11. Deploy the Compose stack to a Linux VPS.

## License

This project is released under the MIT License. See [LICENSE](./LICENSE) for the full text.
