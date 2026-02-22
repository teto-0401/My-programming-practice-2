
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
});

pool.on("error", (err) => {
  console.error("Postgres pool error (idle client):", err);
});
export const db = drizzle(pool, { schema });

export async function ensureDatabaseSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vms (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'My VM',
      status TEXT NOT NULL DEFAULT 'stopped',
      image_path TEXT,
      image_filename TEXT,
      vnc_port INTEGER,
      ram_mb INTEGER NOT NULL DEFAULT 512,
      vram_mb INTEGER NOT NULL DEFAULT 16,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vm_images (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      content_base64 TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}
