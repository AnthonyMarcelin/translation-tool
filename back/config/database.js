const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'translations.db');
const db = new Database(dbPath);

const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      project TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS translation_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_id INTEGER NOT NULL,
      lang TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (translation_id) REFERENCES translations(id) ON DELETE CASCADE,
      UNIQUE(translation_id, lang)
    );
  `);
};

const dbWrapper = {
  run: (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(params);
      return { lastID: result.lastInsertRowid, changes: result.changes };
    } catch (error) {
      throw error;
    }
  },

  get: (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      throw error;
    }
  },

  all: (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      throw error;
    }
  },

  serialize: (callback) => {
    db.serialize(callback);
  },
};

initDb();

module.exports = dbWrapper;
