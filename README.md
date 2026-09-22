# Crypto Alert Bot

A single-chat Telegram bot written in TypeScript that monitors cryptocurrency prices through the CoinGecko API and sends threshold-based alerts. The bot is containerized with Docker, runs scheduled checks with `node-cron`, and persists anti-spam state so it does not resend the same alert after a process or container restart.

> **MVP scope:** one Telegram chat, two configured cryptocurrencies, and fixed alert rules stored in source code.

## Features

- Tracks Bitcoin (`BTC`) and Ethereum (`ETH`) prices in USD through CoinGecko.
- Sends a Telegram alert when:
  - BTC falls below 86,000 USD.
  - ETH rises above 3,000 USD.
- Fetches all tracked coin prices with one batch CoinGecko request.
- Checks prices immediately at application startup and then every two minutes by default.
- Prevents duplicate notifications while the same rule remains triggered.
- Persists triggered rule IDs in `data/alert-state.json`.
- Restores persisted anti-spam state after Node.js or Docker container restart.
- Prevents overlapping asynchronous price checks.
- Provides Telegram commands:
  - `/start` — show bot information and available commands.
  - `/ping` — verify that the bot is reachable.
  - `/price` — show the current BTC and ETH prices.
  - `/status` — show configured rules and their current in-memory trigger state.
- Uses environment variables for credentials and runtime configuration.
- Uses Docker Compose and `restart: unless-stopped` for long-running operation.

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
                                    data/alert-state.json

node-cron scheduler ──> Alert check service
```

The application follows separation of concerns:

- **Configuration** is centralized in one module.
- **Constants** contain the configured alert rules.
- **Services** handle API access, state persistence, and alert evaluation.
- **Bot modules** own Telegram commands and message composition.
- **Scheduler** owns cron registration only.
- `index.ts` is the composition root that creates and connects all modules.

## Tech stack

| Technology | Purpose |
|---|---|
| Node.js | Application runtime |
| TypeScript | Static typing and safer refactoring |
| Telegraf | Telegram Bot API framework |
| CoinGecko API | Cryptocurrency price data |
| node-cron | Scheduled recurring price checks |
| dotenv | Loading environment variables from `.env` |
| Docker | Packaging the application with its runtime |
| Docker Compose | Running the service with environment variables, persistence, and restart policy |

## Project structure

```text
crypto_alert_bot/
├── src/
│   ├── index.ts
│   ├── bot/
│   │   ├── commands.ts
│   │   └── messages.ts
│   ├── config/
│   │   └── env.ts
│   ├── constants/
│   │   └── alert-rules.ts
│   ├── scheduler/
│   │   └── price-check.scheduler.ts
│   ├── services/
│   │   ├── alert-check.service.ts
│   │   ├── alert-state.service.ts
│   │   └── price.service.ts
│   └── types/
│       └── alert.ts
├── data/
│   └── alert-state.json              # Generated at runtime when a rule changes state
├── .dockerignore
├── .env                              # Local secrets; never commit this file
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```

## Module responsibilities

| Module | Responsibility |
|---|---|
| `src/index.ts` | Application composition, startup sequence, and graceful shutdown hooks |
| `src/config/env.ts` | Loads `.env`, validates required values, validates the cron expression |
| `src/constants/alert-rules.ts` | Defines tracked coins and configured price thresholds |
| `src/types/alert.ts` | Shared TypeScript types for CoinGecko data, currency, and rules |
| `src/services/price.service.ts` | Builds the CoinGecko request, fetches prices, and formats currency values |
| `src/services/alert-state.service.ts` | Loads and saves triggered rule IDs to JSON storage |
| `src/services/alert-check.service.ts` | Evaluates rules, sends alerts, applies anti-spam behavior, saves state, prevents overlap |
| `src/bot/messages.ts` | Creates all user-facing Telegram message text |
| `src/bot/commands.ts` | Registers `/start`, `/ping`, `/price`, and `/status` handlers |
| `src/scheduler/price-check.scheduler.ts` | Runs one immediate check and schedules recurring checks with cron |

## Prerequisites

Install the following before running the project locally:

- Node.js 20 or newer.
- npm.
- A Telegram account.
- A Telegram bot token created through `@BotFather`.
- Docker Desktop with Docker Compose if you want to run the containerized version.

The project was developed and tested on Windows 11 using Docker Desktop with the WSL 2 backend.

## Telegram setup

### 1. Create a bot

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`.
3. Choose a display name.
4. Choose a unique username ending in `bot`.
5. Copy the generated bot token.
6. Open a chat with your new bot and send `/start`.

Keep the bot token secret. Anyone with this token can control the bot.

### 2. Find the chat ID

For this single-chat MVP, the bot needs a numeric Telegram chat ID for the destination of automatic alerts.

1. Open `@userinfobot` in Telegram.
2. Start a conversation with it.
3. Copy the numeric value after `Id:`.

Do not publish the token or the chat ID in a public repository.

## Configuration

Create a `.env` file in the project root. You can copy `.env.example` as a starting point.

```env
TELEGRAM_BOT_TOKEN=your_real_telegram_bot_token
TELEGRAM_CHAT_ID=your_numeric_telegram_chat_id

PRICE_CHECK_CRON=*/2 * * * *
COINGECKO_VS_CURRENCY=usd
```

### Environment variables

| Variable | Required | Default | Description |
|---|---:|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | — | Telegram bot token from `@BotFather` |
| `TELEGRAM_CHAT_ID` | Yes | — | Numeric chat ID receiving automatic alerts |
| `PRICE_CHECK_CRON` | No | `*/2 * * * *` | Cron expression for recurring price checks |
| `COINGECKO_VS_CURRENCY` | No | `usd` | Quote currency used by the MVP |

### Cron examples

| Expression | Meaning |
|---|---|
| `*/1 * * * *` | Every minute |
| `*/2 * * * *` | Every two minutes |
| `*/5 * * * *` | Every five minutes |
| `0 * * * *` | At the start of every hour |

For the current CoinGecko-based MVP, checking every two to five minutes is a sensible default. Avoid unnecessarily frequent polling.

## Alert rules

The MVP rules are currently configured in:

```text
src/constants/alert-rules.ts
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

To change a threshold, edit the relevant `below` or `above` value, then rebuild and restart the Docker service:

```bash
docker compose up -d --build
```

## Local development

### Install dependencies

```bash
npm install
```

### Run a TypeScript type check

```bash
npm run check
```

### Start in development mode

```bash
npm run dev
```

`npm run dev` uses `tsx watch`, so it restarts the development process after changes to TypeScript files.

### Start once without watch mode

```bash
npx tsx src/index.ts
```

Use only one bot process at a time. Stop a local development process before starting the Docker container; otherwise, two instances using the same Telegram token can compete for incoming updates.

## Telegram commands

| Command | Result |
|---|---|
| `/start` | Shows the bot status and list of supported commands |
| `/ping` | Responds with `pong` |
| `/price` | Fetches and shows the current BTC and ETH prices |
| `/status` | Shows the configured thresholds and whether each rule is currently marked as `normal` or `TRIGGERED` |

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

## Anti-spam behavior

The bot sends an alert once when a rule changes from normal to triggered. It does not send repeated alerts on every scheduled check while the price stays on the same side of the threshold.

Example for the BTC rule:

1. BTC is at 86,500 USD. The rule `BTC below 86,000 USD` is normal.
2. BTC falls to 85,900 USD. The bot sends one alert and records `btc-below-86000` as triggered.
3. BTC remains at 85,700 USD. The bot sends no duplicate alert.
4. BTC rises to 86,100 USD. The rule resets to normal and the stored ID is removed.
5. BTC falls again to 85,800 USD. The bot sends a new alert.

### Persistent state

Triggered rule IDs are stored in:

```text
data/alert-state.json
```

Example file content:

```json
[
  "btc-below-86000"
]
```

The file is written only when an alert becomes triggered or resets. If the file does not exist, the application starts with an empty state.

This prevents a duplicate notification when the application or Docker container restarts while a threshold remains triggered.

## Overlap protection

Price checks are asynchronous because they call an external API. `AlertCheckService` includes an `isChecking` guard:

- If one check is still running when the next cron trigger occurs, the new check is skipped.
- This avoids concurrent writes to the state file and reduces the chance of duplicate notifications caused by overlapping work.

## Docker

### Dockerfile

The Dockerfile uses a multi-stage build:

1. **Builder stage** installs all dependencies and compiles TypeScript to `dist/`.
2. **Production stage** installs only runtime dependencies and copies compiled JavaScript.

This keeps the runtime image smaller and excludes TypeScript development dependencies from production.

### Docker Compose

`docker-compose.yml` performs three important tasks:

- Loads secrets and settings from `.env`.
- Mounts `./data` into `/app/data` for state persistence.
- Applies `restart: unless-stopped` to keep the bot running after crashes or Docker restarts.

### Build and start

```bash
docker compose up -d --build
```

### Check service status

```bash
docker compose ps
```

Expected state:

```text
crypto-alert-bot   crypto-alert-bot:latest   ...   Up
```

### View logs

```bash
docker compose logs -f
```

Show only the latest lines:

```bash
docker compose logs --tail=50
```

Typical startup output:

```text
No previous alert state file found. Starting with empty state.
Telegram bot started.
Scheduled price check: */2 * * * *
[2026-09-22T21:16:50.932Z] BTC=$86,253.00; triggered=false
[2026-09-22T21:16:50.937Z] ETH=$2,747.96; triggered=false
```

### Restart the service

```bash
docker compose restart
```

### Stop and remove the container

```bash
docker compose down
```

### Verify restart policy

```bash
docker inspect -f "{{.HostConfig.RestartPolicy.Name}}" crypto-alert-bot
```

Expected output:

```text
unless-stopped
```

### Verify persistent data mount

PowerShell:

```powershell
docker inspect -f "{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}" crypto-alert-bot
```

Expected output is similar to:

```text
C:\Users\User\...\crypto_alert_bot\data -> /app/data
```

## Docker commands reference

| Command | Purpose |
|---|---|
| `docker compose up -d --build` | Build the current source code and start the service in the background |
| `docker compose up -d` | Start the existing image in the background |
| `docker compose ps` | Show service/container status |
| `docker compose logs -f` | Follow live logs |
| `docker compose logs --tail=50` | Show the latest 50 log lines |
| `docker compose restart` | Restart the running service |
| `docker compose down` | Stop and remove the container and Compose network |
| `docker compose config --quiet` | Validate Compose configuration without printing secrets |

## Validation checklist

Use this checklist after changing the code or configuration.

### TypeScript

```bash
npm run check
```

Expected: exits without TypeScript errors.

### Local runtime

```bash
npx tsx src/index.ts
```

Expected:

- Telegram bot startup log.
- Immediate price check for BTC and ETH.
- `/ping`, `/price`, and `/status` work in Telegram.

Stop the process with `Ctrl + C` after testing.

### Docker runtime

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=50
```

Expected:

- Container status is `Up`.
- Startup logs contain no module or runtime errors.
- BTC and ETH checks appear in logs.
- Telegram commands work.

### Anti-spam persistence test

1. Temporarily use a threshold that is guaranteed to trigger.
2. Start the application and confirm exactly one Telegram alert arrives.
3. Confirm that `data/alert-state.json` contains the rule ID.
4. Restart the application or container.
5. Confirm that it logs the loaded state and does not send a duplicate alert.
6. Restore the real threshold and remove any test state file if necessary.

## Security notes

- Never commit `.env`.
- Never commit the real Telegram bot token.
- Do not paste the token into issues, screenshots, chat messages, or logs.
- If the token is exposed, revoke it with `@BotFather` and create a new token immediately.
- Keep `data/` out of Git because it may contain operational state.
- Use a dedicated bot token for this project rather than reusing a token from another project.

The existing `.gitignore` should include:

```gitignore
node_modules/
dist/
.env
data/
```

## Known limitations

This is intentionally an MVP. It has the following limitations:

- Supports one configured Telegram chat only.
- Rules are defined in source code rather than through Telegram commands or a database.
- The quote currency type is currently limited to USD.
- `/price` is intentionally tailored to BTC and ETH.
- JSON file persistence is suitable for a single-instance MVP, not for multiple replicas.
- There are no automated tests yet.
- There is no HTTP health endpoint or monitoring integration yet.
- CoinGecko availability and rate limits can affect price retrieval.

## Suggested next improvements

1. Add unit tests for threshold evaluation, anti-spam behavior, reset behavior, and persisted-state loading.
2. Add configurable thresholds through `.env` or Telegram commands.
3. Store alerts and state in SQLite, PostgreSQL, or Redis.
4. Support more currencies and dynamically render `/price` from configured rules.
5. Add a `/help` command and Telegram command registration metadata.
6. Add structured logging with Pino.
7. Add retries with exponential backoff for temporary CoinGecko failures and rate limits.
8. Add a health endpoint for VPS monitoring.
9. Add ESLint and Prettier.
10. Add GitHub Actions to run type checking, tests, and Docker image builds on every push.
11. Deploy the Docker Compose stack to a Linux VPS.

## License

This project is currently intended as a personal learning and portfolio project. Add a license file before publishing or distributing it publicly.
