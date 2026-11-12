import { defineConfig } from "drizzle-kit";

// Load .env so `npm run db:migrate` works without exporting variables by hand.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on variables already set in the environment (e.g. on a server).
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
