import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pool?: mysql.Pool };
const pool = globalForDb.pool ?? mysql.createPool({ uri: connectionString, connectionLimit: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export { schema };
