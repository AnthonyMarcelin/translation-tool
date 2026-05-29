const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// DB_PATH lets tests point at a throwaway database instead of the real one.
const dbFile = process.env.DB_PATH || path.join(__dirname, 'data', 'translations.db');
const dataDir = path.dirname(dbFile);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbFile);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS org_members (
      org_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner','admin','member')),
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (org_id, user_id),
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(org_id, slug),
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner','manager','developer','translator')),
      invited_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_languages (
      project_id INTEGER NOT NULL,
      lang_code TEXT NOT NULL,
      is_source INTEGER DEFAULT 0,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, lang_code),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      permissions TEXT DEFAULT 'read',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_used_at TEXT,
      expires_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, key),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS translation_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_id INTEGER NOT NULL,
      lang TEXT NOT NULL,
      text TEXT NOT NULL DEFAULT '',
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','reviewed','approved')),
      updated_by INTEGER,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(translation_id, lang),
      FOREIGN KEY (translation_id) REFERENCES translations(id) ON DELETE CASCADE,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function slugify(text) {
  return (text || 'project')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'project';
}

function seedDemoData() {
  const hash = bcrypt.hashSync('admin123', 10);
  let adminId;
  try {
    const r = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?,?,?)').run('admin@local.dev', hash, 'Admin');
    adminId = r.lastInsertRowid;
  } catch {
    adminId = db.prepare('SELECT id FROM users WHERE email=?').get('admin@local.dev').id;
  }

  let orgId;
  try {
    const r = db.prepare('INSERT INTO organizations (name, slug) VALUES (?,?)').run('Default', 'default');
    orgId = r.lastInsertRowid;
  } catch {
    orgId = db.prepare('SELECT id FROM organizations WHERE slug=?').get('default').id;
  }
  db.prepare('INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?,?,?)').run(orgId, adminId, 'owner');

  const defaultLangs = ['fr','en','es','de','it','nl','pt','ja'];

  const createProject = (name, desc) => {
    const slug = slugify(name);
    let pid;
    try {
      const r = db.prepare('INSERT INTO projects (org_id, name, slug, description) VALUES (?,?,?,?)').run(orgId, name, slug, desc);
      pid = r.lastInsertRowid;
    } catch {
      pid = db.prepare('SELECT id FROM projects WHERE org_id=? AND slug=?').get(orgId, slug).id;
    }
    db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?,?,?)').run(pid, adminId, 'owner');
    defaultLangs.forEach((lang, i) => {
      db.prepare('INSERT OR IGNORE INTO project_languages (project_id, lang_code, is_source) VALUES (?,?,?)').run(pid, lang, i === 0 ? 1 : 0);
    });
    return pid;
  };

  const addKey = (projectId, key, values) => {
    let tid;
    try {
      const r = db.prepare('INSERT INTO translations (project_id, key) VALUES (?,?)').run(projectId, key);
      tid = r.lastInsertRowid;
    } catch {
      tid = db.prepare('SELECT id FROM translations WHERE project_id=? AND key=?').get(projectId, key).id;
    }
    Object.entries(values).forEach(([lang, text]) => {
      db.prepare('INSERT OR IGNORE INTO translation_values (translation_id, lang, text) VALUES (?,?,?)').run(tid, lang, text);
    });
  };

  const demoId = createProject('Demo Project', 'A sample project to get started');
  addKey(demoId, 'welcome', { fr: 'Bienvenue sur notre plateforme', en: 'Welcome to our platform', es: 'Bienvenido a nuestra plataforma', de: 'Willkommen auf unserer Plattform' });
  addKey(demoId, 'goodbye', { fr: 'Au revoir et à bientôt !', en: 'Goodbye and see you soon!', es: '¡Adiós y hasta pronto!', de: 'Auf Wiedersehen und bis bald!' });
  addKey(demoId, 'settings', { fr: 'Paramètres', en: 'Settings', es: 'Configuración', de: 'Einstellungen' });
  addKey(demoId, 'search', { fr: 'Rechercher', en: 'Search', es: 'Buscar', de: 'Suchen' });
  addKey(demoId, 'login', { fr: 'Se connecter', en: 'Log in', es: 'Iniciar sesión', de: 'Anmelden' });

  const ecomId = createProject('E-commerce Site', 'E-commerce translations');
  addKey(ecomId, 'add_to_cart', { fr: 'Ajouter au panier', en: 'Add to cart', es: 'Añadir al carrito', de: 'In den Warenkorb' });
  addKey(ecomId, 'checkout', { fr: 'Procéder au paiement', en: 'Proceed to checkout', es: 'Proceder al pago', de: 'Zur Kasse gehen' });
  addKey(ecomId, 'shipping', { fr: 'Livraison gratuite', en: 'Free shipping', es: 'Envío gratis', de: 'Kostenloser Versand' });

  console.log('[DB] Demo data seeded. Login: admin@local.dev / admin123');
}

function migrateFromV1() {
  console.log('[DB] Migrating from v1 schema...');

  // Snapshot old data before renaming
  let oldTranslations = [];
  let oldValues = [];
  try {
    oldTranslations = db.prepare('SELECT * FROM translations').all();
    oldValues = db.prepare('SELECT * FROM translation_values').all();
  } catch (e) {
    console.log('[DB] Could not read old data:', e.message);
  }

  const hash = bcrypt.hashSync('admin123', 10);
  const defaultLangs = ['fr','en','es','de','it','nl','pt','ja'];

  // Wrap everything in a transaction so a mid-migration crash rolls back
  // cleanly (SQLite DDL is transactional — DROP TABLE is reversible here).
  db.transaction(() => {
    // Drop old tables (they'll be recreated by createSchema)
    db.exec(`
      DROP TABLE IF EXISTS translation_values;
      DROP TABLE IF EXISTS translations;
    `);

    // Create new schema
    createSchema();

    // Create admin user
    let adminId;
    try {
      const r = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?,?,?)').run('admin@local.dev', hash, 'Admin');
      adminId = r.lastInsertRowid;
    } catch {
      adminId = db.prepare('SELECT id FROM users WHERE email=?').get('admin@local.dev').id;
    }

    // Create default org
    let orgId;
    try {
      const r = db.prepare('INSERT INTO organizations (name, slug) VALUES (?,?)').run('Default', 'default');
      orgId = r.lastInsertRowid;
    } catch {
      orgId = db.prepare('SELECT id FROM organizations WHERE slug=?').get('default').id;
    }
    db.prepare('INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?,?,?)').run(orgId, adminId, 'owner');

    // Map old project names to new project IDs
    const projectMap = {};
    const uniqueProjects = [...new Set(oldTranslations.map(t => t.project))];

    uniqueProjects.forEach(name => {
      const slug = slugify(name);
      let pid;
      try {
        const r = db.prepare('INSERT INTO projects (org_id, name, slug) VALUES (?,?,?)').run(orgId, name, slug);
        pid = r.lastInsertRowid;
      } catch {
        pid = db.prepare('SELECT id FROM projects WHERE org_id=? AND slug=?').get(orgId, slug).id;
      }
      db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?,?,?)').run(pid, adminId, 'owner');
      defaultLangs.forEach((lang, i) => {
        db.prepare('INSERT OR IGNORE INTO project_languages (project_id, lang_code, is_source) VALUES (?,?,?)').run(pid, lang, i === 0 ? 1 : 0);
      });
      projectMap[name] = pid;
    });

    // Migrate translations
    const translationMap = {};
    oldTranslations.forEach(t => {
      const pid = projectMap[t.project];
      if (!pid) return;
      try {
        const r = db.prepare('INSERT OR IGNORE INTO translations (project_id, key, created_at, updated_at) VALUES (?,?,?,?)').run(pid, t.key, t.created_at, t.updated_at);
        if (r.lastInsertRowid) {
          translationMap[t.id] = r.lastInsertRowid;
        } else {
          const existing = db.prepare('SELECT id FROM translations WHERE project_id=? AND key=?').get(pid, t.key);
          if (existing) translationMap[t.id] = existing.id;
        }
      } catch (e) {
        console.error('[DB] Migration error for key', t.key, e.message);
      }
    });

    // Migrate values
    oldValues.forEach(v => {
      const newTid = translationMap[v.translation_id];
      if (!newTid) return;
      try {
        db.prepare('INSERT OR IGNORE INTO translation_values (translation_id, lang, text) VALUES (?,?,?)').run(newTid, v.lang, v.text);
      } catch (e) {
        console.error('[DB] Migration error for value', v.id, e.message);
      }
    });
  })();

  console.log(`[DB] Migration complete. ${oldTranslations.length} keys, ${oldValues.length} values migrated.`);
  console.log('[DB] Default credentials: admin@local.dev / admin123');
}

// Determine DB state and initialize
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);

if (tables.length === 0) {
  // Fresh install
  createSchema();
  seedDemoData();
} else if (tables.includes('translations')) {
  const cols = db.prepare('PRAGMA table_info(translations)').all().map(c => c.name);
  if (cols.includes('project')) {
    // Old v1 schema
    migrateFromV1();
  } else {
    // Already v2
    createSchema(); // idempotent
  }
} else {
  // Partial install or unusual state
  createSchema();
}

module.exports = db;
