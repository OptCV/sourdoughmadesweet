import "./env";
import { connect } from "../server/db/connect";
import { auth as createAuth } from "../server/auth";
import type { Env } from "../server/env";
export const auth = createAuth(
  connect(process.env.DATABASE_URL!).db,
  process.env as unknown as Env,
);
