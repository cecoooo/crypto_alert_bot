import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Pool } from "pg";

import { getMigrationFiles } from "./migration-files.js";

const migrationsDirectory = path.join(process.cwd(), "db", "migrations");

export async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationFiles = await getMigrationFiles(migrationsDirectory);

    const appliedMigrations = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations"
    );

    const appliedFilenames = new Set(
      appliedMigrations.rows.map((migration) => migration.filename)
    );

    for (const filename of migrationFiles) {
      if (appliedFilenames.has(filename)) {
        continue;
      }

      const migrationPath = path.join(migrationsDirectory, filename);
      const sql = await readFile(migrationPath, "utf8");

      await client.query(sql);

      await client.query(
        `
          INSERT INTO schema_migrations (filename)
          VALUES ($1)
        `,
        [filename]
      );

      console.log(`Applied database migration: ${filename}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}