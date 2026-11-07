import "./env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { connect } from "../server/db/connect";
const { db, pool } = connect(process.env.DATABASE_URL!);
try {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Migrations applied.");
} finally {
  await pool.end();
}
