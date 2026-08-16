import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cached: NeonHttpDatabase<typeof schema> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (cached) return cached;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for the connected Nowmal workspace.");
  }
  cached = drizzle(neon(connectionString), { schema });
  return cached;
}
