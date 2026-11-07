import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "../db/schema";
import type { DB } from "../db/connect";
import type { Env } from "../env";
export function auth(db: DB, env: Env, provision = false) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],
    emailAndPassword: {
      enabled: true,
      disableSignUp: !provision,
      minPasswordLength: 14,
    },
    advanced: { useSecureCookies: env.APP_ENV !== "development" },
    session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 },
    rateLimit: { enabled: true },
  });
}
