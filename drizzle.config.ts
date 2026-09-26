import type { Config } from "drizzle-kit";

const url = process.env.TURSO_DATABASE_URL ?? "file:dev.db";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
