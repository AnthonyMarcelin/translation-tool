#!/usr/bin/env node
/**
 * Seed (or update) an admin user.
 *
 * Idempotent: if the email already exists its password and name are updated.
 * The new user is made owner of every existing organization and project so
 * they immediately see all the data.
 *
 * Credentials are read from the environment — never hardcode a password here,
 * so nothing secret lands in git:
 *
 *   SEED_EMAIL=you@example.com SEED_NAME="Your Name" SEED_PASSWORD='secret' \
 *     node scripts/seed-user.js
 *
 * Inside Docker:
 *   docker compose exec \
 *     -e SEED_EMAIL=you@example.com -e SEED_NAME="Your Name" -e SEED_PASSWORD='secret' \
 *     back node scripts/seed-user.js
 */
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const email = process.env.SEED_EMAIL;
const name = process.env.SEED_NAME || (email ? email.split('@')[0] : null);
const password = process.env.SEED_PASSWORD;

if (!email || !password) {
  console.error('[seed-user] SEED_EMAIL and SEED_PASSWORD are required.');
  console.error("  e.g. SEED_EMAIL=you@x.com SEED_PASSWORD='secret' node scripts/seed-user.js");
  process.exit(1);
}

const dbFile = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'translations.db');
const db = new Database(dbFile);
db.pragma('foreign_keys = ON');

const hash = bcrypt.hashSync(password, 10);

const run = db.transaction(() => {
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  let userId;
  if (existing) {
    db.prepare('UPDATE users SET password_hash=?, name=? WHERE id=?').run(hash, name, existing.id);
    userId = existing.id;
    console.log(`[seed-user] Updated existing user ${email} (id=${userId})`);
  } else {
    const r = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?,?,?)').run(email, hash, name);
    userId = r.lastInsertRowid;
    console.log(`[seed-user] Created user ${email} (id=${userId})`);
  }

  // Owner on every org
  const orgs = db.prepare('SELECT id FROM organizations').all();
  for (const o of orgs) {
    db.prepare(`INSERT INTO org_members (org_id, user_id, role) VALUES (?,?,'owner')
                ON CONFLICT(org_id, user_id) DO UPDATE SET role='owner'`).run(o.id, userId);
  }

  // Owner on every project
  const projects = db.prepare('SELECT id FROM projects').all();
  for (const p of projects) {
    db.prepare(`INSERT INTO project_members (project_id, user_id, role) VALUES (?,?,'owner')
                ON CONFLICT(project_id, user_id) DO UPDATE SET role='owner'`).run(p.id, userId);
  }

  console.log(`[seed-user] Granted owner on ${orgs.length} org(s) and ${projects.length} project(s).`);
});

run();
db.close();
