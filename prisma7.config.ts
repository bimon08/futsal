// Prisma 7 config — connection URLs are configured here (not in schema.prisma)
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local (Next.js convention) instead of default .env
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL (session-mode pooler, port 5432) for migrations/schema pushes
    // PgBouncer transaction-mode (port 6543) doesn't support DDL operations
    url: process.env["DIRECT_URL"],
  },
});
