import { Pool } from "pg";

import { env } from "../config/env.js";

function createPostgresPool(): Pool {
  if (!env.databaseUrl) {
    throw new Error("Missing DATABASE_URL in .env");
  }

  return new Pool({
    connectionString: env.databaseUrl
  });
}

export const postgresPool = createPostgresPool();