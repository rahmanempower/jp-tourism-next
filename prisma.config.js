import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Travel & Visa Services Platform — Prisma 7 Config
// DATABASE_URL must be set in .env as a MongoDB Atlas connection string
// Format: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
