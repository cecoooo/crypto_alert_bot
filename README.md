# Crypto Alert Bot

A single-chat Telegram bot written in TypeScript that monitors Bitcoin and Ethereum prices through the CoinGecko API. It sends threshold-based Telegram alerts, prevents duplicate notifications while a rule remains triggered, and persists alert state in PostgreSQL.

The project is a learning and portfolio application focused on TypeScript, Node.js, Docker Compose, PostgreSQL, SQL migrations, automated tests, and deployment on Google Cloud Compute Engine.

> **MVP scope:** one configured Telegram chat, BTC and ETH monitoring, and source-code-defined alert rules.

## Features

- Tracks Bitcoin (`BTC`) and Ethereum (`ETH`) against USD through CoinGecko.
- Sends one Telegram alert when BTC falls below 86,000 USD.
- Sends one Telegram alert when ETH rises above 3,000 USD.
- Fetches BTC and ETH prices with one CoinGecko batch request.
- Runs an immediate price check at startup and then scheduled checks every two minutes by default.
- Prevents duplicate notifications while a rule stays triggered.
- Resets a rule after the price returns to its normal range, allowing a later new alert.
- Persists triggered rule IDs in PostgreSQL.
- Restores anti-spam state after application, container, or VM restart.
- Runs SQL migrations automatically before loading persisted state.
- Prevents overlapping asynchronous price checks.
- Provides `/start`, `/ping`, `/price`, and `/status` Telegram commands.
- Includes unit tests with Vitest.
- Runs as a Docker Compose stack with a bot container and private PostgreSQL container.

## Project layout

```text
crypto_alert_bot/
├── prj/
│   ├── src/
│   │   ├── index.ts
│   │   ├── bot/
│   │   │   ├── commands.ts
│   │   │   └── messages.ts
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── constants/
│   │   │   └── alert-rules.ts
│   │   ├── db/
│   │   │   ├── migrate.ts
│   │   │   ├── migration-files.ts
│   │   │   ├── postgres.ts
│   │   │   └── __tests__/
│   │   │       └── migration-files.test.ts
│   │   ├── scheduler/
│   │   │   └── price-check.scheduler.ts
│   │   ├── services/
│   │   │   ├── alert-check.service.ts
│   │   │   ├── alert-state.store.ts
│   │   │   ├── postgres-alert-state.store.ts
│   │   │   ├── price.service.ts
│   │   │   └── __tests__/
│   │   │       ├── alert-check.test-helpers.ts
│   │   │       ├── alert-check.triggering.test.ts
│   │   │       ├── alert-check.state.test.ts
│   │   │       ├── alert-check.resilience.test.ts
│   │   │       └── postgres-alert-state.store.test.ts
│   │   └── types/
│   │       └── alert.ts
│   ├── db/
│   │   └── migrations/
│   │       └── 001_create_alert_states.sql
│   ├── .dockerignore
│   ├── .env
│   ├── .env.example
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── vitest.setup.ts
├── .gitignore
├── LICENSE
└── README.md
```

All application commands run from `prj/`, because it contains `package.json`, `.env`, the Docker configuration, and the migration directory.

## Architecture

```text
Telegram user
     │
     ├── /start, /ping, /price, /status
     ▼
Telegraf command handlers
     │
     ├── PriceService ────────────────► CoinGecko API
     │
     └── AlertCheckService
              │
              ├── rule evaluation
              ├── in-memory anti-spam Set
              ├── Telegram notification
              └── AlertStateStore
                       │
                       ▼
              PostgresAlertStateStore
                       │
                       ▼
                  PostgreSQL

node-cron scheduler ───────────────────► AlertCheckService
```

`src/index.ts` is intentionally a thin composition root. It creates shared dependencies, runs migrations, loads persisted alert state, starts Telegram polling, and starts the scheduler.

## Tech stack

| Technology | Purpose |
|---|---|
| Node.js | Application runtime |
| TypeScript | Static typing |
| Telegraf | Telegram Bot API framework |
| CoinGecko API | Cryptocurrency price data |
| node-cron | Scheduled price checks |
| PostgreSQL | Persistent anti-spam alert state |
| pg | PostgreSQL driver |
| Vitest | Unit testing |
| Docker | Application packaging |
| Docker Compose | Bot and PostgreSQL orchestration |

## Configuration

Enter the application directory:

```bash
cd prj
```

Create a private environment file from the example.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS, Linux, or Git Bash:

```bash
cp .env.example .env
```

Edit `prj/.env` locally. Do not commit it.

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_numeric_telegram_chat_id

PRICE_CHECK_CRON=*/2 * * * *
COINGECKO_VS_CURRENCY=usd

POSTGRES_DB=crypto_alert_bot
POSTGRES_USER=crypto_alert_bot
POSTGRES_PASSWORD=use_a_long_random_password
DATABASE_URL=postgresql://crypto_alert_bot:use_a_long_random_password@postgres:5432/crypto_alert_bot
```

| Variable | Required | Default | Description |
|---|---:|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | — | Telegram bot token from `@BotFather` |
| `TELEGRAM_CHAT_ID` | Yes | — | Numeric Telegram chat ID for automatic alerts |
| `PRICE_CHECK_CRON` | No | `*/2 * * * *` | Cron expression for scheduled checks |
| `COINGECKO_VS_CURRENCY` | No | `usd` | Quote currency used by this MVP |
| `POSTGRES_DB` | Yes | — | PostgreSQL database created by the Compose service |
| `POSTGRES_USER` | Yes | — | PostgreSQL user created by the Compose service |
| `POSTGRES_PASSWORD` | Yes | — | Strong PostgreSQL password; keep private |
| `DATABASE_URL` | Yes | — | Application database connection URL; hostname is `postgres` inside Compose |

`DATABASE_URL` uses `postgres` as the hostname because that is the PostgreSQL Compose service name. Do not change it to `localhost` for the Docker deployment.

## Alert rules

Rules are defined in:

```text
prj/src/constants/alert-rules.ts
```

Current production rules:

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

After changing a rule, rebuild the bot image:

```bash
cd prj
docker compose up -d --build
```

## Local development

Run all commands in this section from `prj/`.

### Install dependencies

```bash
npm ci
```

### Type-check

```bash
npm run check
```

### Run tests

```bash
npm test
```

Expected result:

```text
Test Files  5 passed
Tests       16 passed
```

Test output can include intentional `console.warn` and `console.error` messages because resilience and failure paths are tested.

### Run in development mode

```bash
npm run dev
```

Development mode uses `tsx watch` and requires a reachable PostgreSQL database through `DATABASE_URL`.

### Run once

```bash
npx tsx src/index.ts
```

Run only one bot instance at a time. Stop a locally running process with `Ctrl + C` before starting Docker, otherwise two processes can compete for Telegram updates.

## Telegram commands

| Command | Result |
|---|---|
| `/start` | Shows the bot introduction and supported commands |
| `/ping` | Replies with `pong` |
| `/price` | Displays current BTC and ETH prices |
| `/status` | Displays configured rules and current `normal` or `TRIGGERED` state |

Example `/price` response:

```text
💰 Current prices

BTC: $84,093.00
ETH: $2,700.13
```

Example `/status` response:

```text
⚙️ Alert status

BTC: below $86,000.00 — TRIGGERED
ETH: above $3,000.00 — normal
```

## Alert behavior

An alert is sent only when a rule transitions from `normal` to `triggered`.

Example for BTC:

1. BTC is 86,500 USD: `BTC below 86,000 USD` is normal.
2. BTC falls to 85,900 USD: one alert is sent and `btc-below-86000` becomes triggered.
3. BTC remains at 85,700 USD: no duplicate alert is sent.
4. BTC rises to 86,100 USD: the rule returns to normal and the state is persisted.
5. BTC later falls to 85,800 USD: a new alert is sent.

`AlertCheckService` owns the rule evaluation and its in-memory `Set<string>` of triggered rule IDs. It persists changes only when a rule transitions into or out of the triggered state.

### Overlap protection

Price checks are asynchronous. If one check is still running when the next cron tick occurs, the `isChecking` guard skips the overlapping run. This avoids concurrent state changes and reduces duplicate-alert risk.

## PostgreSQL persistence

The persistence boundary is the `AlertStateStore` interface:

```ts
export interface AlertStateStore {
  load(): Promise<Set<string>>;
  save(triggeredRuleIds: Set<string>): Promise<void>;
}
```

`PostgresAlertStateStore` implements this interface and uses the configured Telegram chat ID as the single-chat identity for this MVP.

The `alert_states` table stores the currently triggered rules:

```sql
CREATE TABLE IF NOT EXISTS alert_states (
  chat_id BIGINT NOT NULL,
  rule_id TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, rule_id)
);
```

The store reads all triggered rule IDs for the configured chat. On a state update, it uses one transaction:

```text
BEGIN
DELETE current chat state
INSERT current triggered rule IDs
COMMIT
```

On failure, it rolls back the transaction and releases the pooled PostgreSQL client.

## SQL migrations

SQL migrations live in:

```text
prj/db/migrations/
```

The custom migration runner:

1. Reads only `.sql` files from `db/migrations`.
2. Sorts migration filenames.
3. Creates the `schema_migrations` tracking table if needed.
4. Applies only migrations that are not already recorded.
5. Records each successfully applied migration.
6. Executes the sequence inside a transaction and rolls back on failure.

Migrations run during application startup before alert state is loaded. SQL migration files are copied into the production image by the Dockerfile:

```dockerfile
COPY db ./db
```

Do not remove this Dockerfile line.

### Inspect migrations and state

Run from `prj/` after the Compose stack is running:

```powershell
docker compose exec -T postgres psql -U crypto_alert_bot -d crypto_alert_bot -c "SELECT filename, applied_at FROM schema_migrations ORDER BY filename;"
```

```powershell
docker compose exec -T postgres psql -U crypto_alert_bot -d crypto_alert_bot -c "SELECT rule_id, triggered_at FROM alert_states ORDER BY triggered_at;"
```

## Docker Compose

The Compose stack has two services:

- `crypto-alert-bot`: the Telegram bot.
- `postgres`: private PostgreSQL database.

PostgreSQL uses the Docker-managed named volume `postgres-data` mounted at `/var/lib/postgresql/data`. This keeps database data when containers are recreated.

The database has no `ports:` mapping. `5432/tcp` in `docker compose ps` means only that PostgreSQL listens inside the Docker network; it is not exposed publicly on the host.

### Build and start

```bash
cd prj
docker compose config --quiet
docker compose up -d --build
```

### Check status and logs

```bash
docker compose ps
```

Expected services:

```text
crypto-alert-bot            Up
crypto-alert-bot-postgres   Up (healthy)
```

```bash
docker compose logs --tail=50 crypto-alert-bot
```

Typical startup logs:

```text
Applied database migration: 001_create_alert_states.sql
Loaded 0 triggered alert state(s).
Telegram bot started.
Scheduled price check: */2 * * * *
```

On later restarts, the migration is already recorded, so `Applied database migration` is not printed again.

### Inspect PostgreSQL health

```powershell
docker inspect -f "{{.State.Health.Status}}" crypto-alert-bot-postgres
```

Expected:

```text
healthy
```

### Restart or stop

```bash
# Restart only the bot service
docker compose restart crypto-alert-bot

# Stop and remove containers and the Compose network
docker compose down
```

Do not use `docker compose down -v` unless you intentionally want to delete PostgreSQL data, including alert state and migration history.

## Validation checklist

Run from `prj/`:

```powershell
npm ci
npm run check
npm test
docker compose config --quiet
docker compose down
docker compose up -d --build
docker compose ps
docker compose logs --tail=50 crypto-alert-bot
```

Expected:

- `npm run check` exits without TypeScript errors.
- `npm test` reports 5 passing test files and 16 passing tests.
- `crypto-alert-bot` is `Up`.
- `crypto-alert-bot-postgres` is `Up (healthy)`.
- The bot logs show PostgreSQL state loading and Telegram startup.
- No missing migration-directory errors occur.

Then verify migration history and persisted state:

```powershell
docker compose exec -T postgres psql -U crypto_alert_bot -d crypto_alert_bot -c "SELECT filename, applied_at FROM schema_migrations ORDER BY filename;"
docker compose exec -T postgres psql -U crypto_alert_bot -d crypto_alert_bot -c "SELECT rule_id, triggered_at FROM alert_states ORDER BY triggered_at;"
```

Finally, restart the bot and confirm that a currently triggered rule does not send a duplicate alert:

```powershell
docker compose restart crypto-alert-bot
docker compose logs --tail=30 crypto-alert-bot
```

## Google Cloud deployment

The project is deployed as a Docker Compose stack on a Debian Google Cloud Compute Engine VM.

On the VM, the repository is located at:

```text
/opt/crypto-alert-bot
```

The application directory is:

```text
/opt/crypto-alert-bot/prj
```

### Deployment update

After committing and pushing changes from the local machine, connect to the VM and run:

```bash
cd /opt/crypto-alert-bot
git pull --ff-only

cd prj
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=50 crypto-alert-bot
```

The VM's private `.env` must contain the Telegram variables and the PostgreSQL variables shown in `.env.example`. Use a strong VM-specific PostgreSQL password, keep the `DATABASE_URL` hostname as `postgres`, and never print or commit `.env`.

### JSON-to-PostgreSQL migration on the VM

If the existing VM deployment still has legacy JSON state in `data/alert-state.json`, migrate it before starting the new PostgreSQL-backed bot. This preserves triggered rules and avoids a duplicate alert when a threshold is already breached.

Safe sequence:

1. Stop only the bot service.
2. Keep PostgreSQL running.
3. Read the legacy JSON state locally on the VM.
4. Insert matching state rows into `alert_states` using the configured chat ID without printing credentials or the chat ID.
5. Start the PostgreSQL-backed bot.
6. Verify logs and database state.
7. Remove the legacy VM `data/` directory only after verification.

If the JSON state is absent or empty, no manual state migration is required.

## Security

- Never commit `prj/.env`.
- Never share a Telegram bot token, Telegram chat ID, database password, or full `DATABASE_URL`.
- Use a strong unique PostgreSQL password for each environment.
- Do not expose PostgreSQL with a Compose `ports:` mapping for this MVP.
- If a Telegram token is exposed, revoke and replace it through `@BotFather`.

The root `.gitignore` should include:

```gitignore
node_modules/
dist/
.env
```

## Limitations

- One configured Telegram chat.
- Rules are stored in source code.
- The MVP uses USD only.
- `/price` is focused on BTC and ETH.
- The PostgreSQL store is single-chat by design.
- There is no HTTP health endpoint or external monitoring.
- CoinGecko availability and rate limits can affect price retrieval.

## Next improvements

1. Add a GitHub Actions workflow for type checks, tests, and Docker builds.
2. Add structured logging with Pino.
3. Add retry and exponential backoff for transient CoinGecko failures.
4. Add a health endpoint and external uptime monitoring.
5. Move rules to a database or Telegram management commands.
6. Support multiple Telegram chats and per-chat rules.
7. Add observability and backup procedures for PostgreSQL.

## License

This project is released under the MIT License. See [LICENSE](./LICENSE) for the full text.