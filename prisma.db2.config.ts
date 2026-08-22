import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/db2/schema.prisma",
  migrations: {
    path: "prisma/db2/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL_2"],
  },
});