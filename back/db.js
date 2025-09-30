const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "data", "translations.db");
const db = new sqlite3.Database(dbPath);

// Création des tables si elles n'existent pas
const initDb = () => {
  db.serialize(() => {
    db.run("DROP TABLE IF EXISTS translation_values");
    db.run("DROP TABLE IF EXISTS translations");
    db.run(`CREATE TABLE IF NOT EXISTS translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      project TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS translation_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_id INTEGER NOT NULL,
      lang TEXT NOT NULL,
      text TEXT,
      FOREIGN KEY (translation_id) REFERENCES translations(id)
    )`);
  });
};

initDb();

module.exports = db;
