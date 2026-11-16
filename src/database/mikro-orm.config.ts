import { defineConfig } from "@mikro-orm/postgresql";

export default defineConfig({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  dbName: process.env.POSTGRES_DB ?? "wagering",
  user: process.env.POSTGRES_USER ?? "wagering",
  password: process.env.POSTGRES_PASSWORD ?? "wagering_local",
  entities: ["./dist/database/entities"],
  entitiesTs: ["./src/database/entities"],
  migrations: {
    path: "./dist/database/migrations",
    pathTs: "./src/database/migrations",
  },
});
