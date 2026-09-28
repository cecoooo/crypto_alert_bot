import type { Pool } from "pg";

import { env } from "../config/env.js";
import type { AlertStateStore } from "./alert-state.store.js";

export class PostgresAlertStateStore implements AlertStateStore {
  public constructor(private readonly pool: Pool) {}

  public async load(): Promise<Set<string>> {
    try {
      const result = await this.pool.query<{ rule_id: string }>(
        `
          SELECT rule_id
          FROM alert_states
          WHERE chat_id = $1
        `,
        [env.telegramChatId]
      );

      console.log(`Loaded ${result.rowCount} triggered alert state(s).`);

      return new Set(result.rows.map((row) => row.rule_id));
    } catch (error) {
      console.error("Failed to load alert state from PostgreSQL:", error);

      return new Set<string>();
    }
  }

  public async save(triggeredRuleIds: Set<string>): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          DELETE FROM alert_states
          WHERE chat_id = $1
        `,
        [env.telegramChatId]
      );

      for (const ruleId of triggeredRuleIds) {
        await client.query(
          `
            INSERT INTO alert_states (chat_id, rule_id)
            VALUES ($1, $2)
          `,
          [env.telegramChatId, ruleId]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Failed to save alert state to PostgreSQL:", error);
    } finally {
      client.release();
    }
  }
}