import "server-only";

import dns from "dns";
import fs from "fs";
import path from "path";
import { MongoClient, type Collection } from "mongodb";
import { ApiError } from "./errors";
import { createSeed } from "./seed";
import type { AnalyticsEvent, DB } from "./types";

/**
 * Persistence for the shop document. With MONGODB_URI set, the whole shop lives in one MongoDB
 * document guarded by a version number (compare-and-swap). Without it, a local JSON file is used.
 */

export type Snapshot = { db: DB; version: number };

type ShopDoc = { _id: string; version: number; data: DB; updatedAt?: Date };

const DOC_ID = "shop";

export function usingMongo() {
  return Boolean(process.env.MONGODB_URI);
}

export async function loadSnapshot(): Promise<Snapshot> {
  return usingMongo() ? loadMongo() : { db: loadFile(), version: 0 };
}

/** Returns false when someone else saved first; the caller should reload and retry. */
export async function saveSnapshot(db: DB, version: number): Promise<boolean> {
  if (!usingMongo()) {
    writeFile(db);
    return true;
  }
  const shop = await shopCollection();
  const result = await shop.updateOne(
    { _id: DOC_ID, version },
    { $set: { data: db, version: version + 1, updatedAt: new Date() } },
  );
  return result.matchedCount === 1;
}

export async function saveEvents(events: AnalyticsEvent[]) {
  if (!usingMongo() || !events.length) return;
  try {
    const client = await mongo();
    await client
      .db(dbName())
      .collection("analytics")
      .insertMany(events.map((event) => ({ ...event, at: new Date(event.at) })));
  } catch (error) {
    console.error("analytics write failed", error);
  }
}

/* ------------------------------------------------------------------ Mongo */

declare global {
  var __ccMongo: Promise<MongoClient> | undefined;
}

function dbName() {
  return process.env.MONGODB_DB || "chickencrew";
}

function mongo(): Promise<MongoClient> {
  if (!globalThis.__ccMongo) {
    // Node on Windows often fails mongodb+srv lookups through the router's DNS.
    if (process.platform === "win32") dns.setServers(["8.8.8.8", "1.1.1.1"]);
    const client = new MongoClient(process.env.MONGODB_URI!, {
      ignoreUndefined: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    globalThis.__ccMongo = client.connect().catch((error) => {
      globalThis.__ccMongo = undefined;
      throw error;
    });
  }
  return globalThis.__ccMongo;
}

async function shopCollection(): Promise<Collection<ShopDoc>> {
  try {
    const client = await mongo();
    return client.db(dbName()).collection<ShopDoc>("shop");
  } catch (error) {
    console.error("MongoDB connection failed", error);
    throw new ApiError(503, "The shop is temporarily unavailable. Please try again.");
  }
}

async function loadMongo(): Promise<Snapshot> {
  const shop = await shopCollection();
  const existing = await shop.findOne({ _id: DOC_ID });
  if (existing) return { db: existing.data, version: existing.version };
  try {
    await shop.insertOne({ _id: DOC_ID, version: 1, data: createSeed(), updatedAt: new Date() });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  const created = await shop.findOne({ _id: DOC_ID });
  if (!created) throw new ApiError(503, "The shop is temporarily unavailable. Please try again.");
  return { db: created.data, version: created.version };
}

/* ------------------------------------------------------------------- File */

function dbFile(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  if (process.env.VERCEL) return "/tmp/chicken-crew-db.json";
  return path.join(process.cwd(), "data", "db.json");
}

function loadFile(): DB {
  const file = dbFile();
  if (!fs.existsSync(file)) {
    const seed = createSeed();
    writeFile(seed);
    return seed;
  }
  let raw = "";
  try {
    raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw) as DB;
  } catch {
    const tmp = `${file}.tmp`;
    if (fs.existsSync(tmp)) {
      try {
        const recovered = JSON.parse(fs.readFileSync(tmp, "utf8")) as DB;
        writeFile(recovered);
        return recovered;
      } catch {
        // The temporary file is incomplete too.
      }
    }
    if (!raw.trim()) {
      const seed = createSeed();
      writeFile(seed);
      return seed;
    }
    throw new ApiError(500, "The shop catalogue could not be read. Please try again.");
  }
}

function writeFile(db: DB) {
  const file = dbFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, file);
}
