import { Pool, type PoolConfig } from "pg";

/**
 * Process-wide Postgres pool, used by the indexed-search-server API route.
 * Cached on globalThis so Next dev / Fluid Compute warm instances reuse it
 * across requests.
 */
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function makePool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — see .env.local.");
  }
  const config: PoolConfig = {
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
  return new Pool(config);
}

export function pool(): Pool {
  if (!globalThis.__pgPool) {
    globalThis.__pgPool = makePool();
  }
  return globalThis.__pgPool;
}
