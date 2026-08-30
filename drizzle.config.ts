import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// DATABASE_SSL=true active TLS pour drizzle-kit aussi (nécessaire pour les
// bases MySQL hébergées dans le cloud : TiDB Serverless, PlanetScale,
// Aiven...). Voir server/db/client.ts pour la même logique côté application.
const useSsl = process.env.DATABASE_SSL === "true";
const parsedUrl = new URL(connectionString);

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: useSsl
    ? {
        host: parsedUrl.hostname,
        port: parsedUrl.port ? Number(parsedUrl.port) : 4000,
        user: decodeURIComponent(parsedUrl.username),
        password: decodeURIComponent(parsedUrl.password),
        database: parsedUrl.pathname.replace(/^\//, ""),
        ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      }
    : { url: connectionString },
});