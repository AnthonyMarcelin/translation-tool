#!/usr/bin/env node
/**
 * Standalone database backup.
 *
 * Dumps every table to a single timestamped JSON file. Read-only — it never
 * writes to the database, so it's safe to run against a live prod DB before a
 * deploy/migration.
 *
 *   node scripts/backup.js                 # → back/data/backups/backup-<ts>.json
 *   DB_PATH=/path/to/translations.db node scripts/backup.js
 *   node scripts/backup.js /custom/out.json
 *
 * Inside Docker:
 *   docker compose exec back node scripts/backup.js
 *   docker compose cp back:/app/data/backups ./backups   # copy out to host
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbFile = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'translations.db');
if (!fs.existsSync(dbFile)) {
  console.error(`[backup] Database not found: ${dbFile}`);
  process.exit(1);
}

const db = new Database(dbFile, { readonly: true });

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  .all()
  .map((r) => r.name);

const dump = {
  meta: {
    created_at: new Date().toISOString(),
    source: dbFile,
    tables: tables.length,
  },
  data: {},
};

let totalRows = 0;
for (const t of tables) {
  const rows = db.prepare(`SELECT * FROM "${t}"`).all();
  dump.data[t] = rows;
  totalRows += rows.length;
  console.log(`[backup] ${t}: ${rows.length} rows`);
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outArg = process.argv[2];
const outFile = outArg || path.join(path.dirname(dbFile), 'backups', `backup-${ts}.json`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(dump, null, 2));

console.log(`[backup] Wrote ${totalRows} rows from ${tables.length} tables → ${outFile}`);
db.close();
