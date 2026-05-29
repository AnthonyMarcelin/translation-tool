#!/usr/bin/env node
/**
 * Restore a database from a backup.js JSON dump.
 *
 * DESTRUCTIVE: clears every table present in the dump, then re-inserts the
 * rows. Wrapped in a single transaction — on any error nothing is committed.
 * Requires explicit --force to run, so it can't fire by accident.
 *
 *   node scripts/restore.js backups/backup-<ts>.json --force
 *   DB_PATH=/path/to/translations.db node scripts/restore.js dump.json --force
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const force = args.includes('--force');
const dumpFile = args.find((a) => !a.startsWith('--'));

if (!dumpFile) {
  console.error('[restore] Usage: node scripts/restore.js <dump.json> --force');
  process.exit(1);
}
if (!fs.existsSync(dumpFile)) {
  console.error(`[restore] Dump not found: ${dumpFile}`);
  process.exit(1);
}
if (!force) {
  console.error('[restore] Refusing to run without --force (this overwrites the DB).');
  process.exit(1);
}

const dbFile = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'translations.db');
const dump = JSON.parse(fs.readFileSync(dumpFile, 'utf8'));
const data = dump.data || {};
const tables = Object.keys(data);

if (tables.length === 0) {
  console.error('[restore] Dump has no data.');
  process.exit(1);
}

const db = new Database(dbFile);
db.pragma('foreign_keys = OFF'); // re-inserting in dump order may not respect FK order

const restore = db.transaction(() => {
  for (const t of tables) {
    db.prepare(`DELETE FROM "${t}"`).run();
    const rows = data[t];
    if (!rows.length) continue;
    const cols = Object.keys(rows[0]);
    const stmt = db.prepare(
      `INSERT INTO "${t}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`
    );
    for (const row of rows) stmt.run(cols.map((c) => row[c]));
    console.log(`[restore] ${t}: ${rows.length} rows`);
  }
});

restore();
db.pragma('foreign_keys = ON');
console.log(`[restore] Restored ${tables.length} tables from ${dumpFile}`);
db.close();
