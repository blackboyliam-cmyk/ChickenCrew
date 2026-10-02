// Copies data/db.json into MongoDB, replacing whatever shop data is there.
// Usage: npm run db:push   (reads MONGODB_URI and MONGODB_DB from .env.local)
import dns from "dns";
import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Add it to .env.local first.");
  process.exit(1);
}

// Node on Windows often fails mongodb+srv lookups through the router's DNS.
if (process.platform === "win32") dns.setServers(["8.8.8.8", "1.1.1.1"]);

const file = path.join(process.cwd(), "data", "db.json");
if (!fs.existsSync(file)) {
  console.error("data/db.json was not found. Start the site locally once to create it.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, "utf8"));
const client = new MongoClient(uri, { ignoreUndefined: true });

try {
  await client.connect();
  const shop = client.db(process.env.MONGODB_DB || "chickencrew").collection("shop");
  const existing = await shop.findOne({ _id: "shop" }, { projection: { version: 1 } });
  await shop.replaceOne(
    { _id: "shop" },
    { version: (existing?.version || 0) + 1, data, updatedAt: new Date() },
    { upsert: true },
  );
  console.log(
    `Uploaded ${data.products?.length ?? 0} products, ${data.orders?.length ?? 0} orders and ${data.users?.length ?? 0} customers.`,
  );
} finally {
  await client.close();
}
