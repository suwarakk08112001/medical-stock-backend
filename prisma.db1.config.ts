import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/db1/schema.prisma",
  migrations: {
    path: "prisma/db1/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL_1"],
  },
});
