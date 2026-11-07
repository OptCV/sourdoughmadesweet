import "./env";
import { connect } from "../server/db/connect";
import { auth } from "../server/auth";
import type { Env } from "../server/env";
if (
  !process.env.OWNER_EMAIL ||
  !process.env.OWNER_PASSWORD ||
  process.env.OWNER_PASSWORD.length < 14 ||
  !process.env.BETTER_AUTH_SECRET
)
  throw new Error(
    "Set OWNER_EMAIL, OWNER_PASSWORD (14+ characters), BETTER_AUTH_SECRET and BETTER_AUTH_URL.",
  );
const { db, pool } = connect(process.env.DATABASE_URL!);
try {
  await auth(db, process.env as unknown as Env, true).api.signUpEmail({
    body: {
      email: process.env.OWNER_EMAIL,
      password: process.env.OWNER_PASSWORD,
      name: "Bakery Owner",
    },
  });
  console.log("Owner provisioned. Remove OWNER_PASSWORD from the environment.");
} finally {
  await pool.end();
}
