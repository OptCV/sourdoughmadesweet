import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
export function connect(url: string) {
  const pool = new Pool({
    connectionString: url,
    max: 3,
    connectionTimeoutMillis: 10000,
  });
  return { db: drizzle(pool, { schema }), pool };
}
export type DB = ReturnType<typeof connect>["db"];
