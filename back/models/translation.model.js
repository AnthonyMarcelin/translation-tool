const db = require('../config/database');

const Translation = {
  create: async ({ key, project_id }) => {
    const result = db.run(
      'INSERT INTO translations (key, project_id) VALUES (?, ?)',
      [key, project_id],
    );
    return { id: result.lastID, key, project_id };
  },

  findById: async (id) =>
    db.get('SELECT * FROM translations WHERE id = ?', [id]),

  findByProject: async (project_id) =>
    db.all('SELECT * FROM translations WHERE project_id = ? ORDER BY key ASC', [
      project_id,
    ]),

  update: async (id, { key, project_id }) => {
    db.run(
      'UPDATE translations SET key = ?, project_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [key, project_id, id],
    );
    return { id, key, project_id };
  },

  delete: async (id) => {
    db.transaction(() => {
      db.run('DELETE FROM translation_values WHERE translation_id = ?', [id]);
      db.run('DELETE FROM translations WHERE id = ?', [id]);
    });
  },

  getTranslationValues: async (translationId) =>
    db.all('SELECT * FROM translation_values WHERE translation_id = ?', [
      translationId,
    ]),

  addTranslationValue: async ({ translation_id, lang, text }) => {
    db.run(
      `INSERT OR REPLACE INTO translation_values
       (translation_id, lang, text, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [translation_id, lang, text],
    );
    return db.get(
      'SELECT * FROM translation_values WHERE translation_id = ? AND lang = ?',
      [translation_id, lang],
    );
  },

  updateTranslationValue: async (id, text) => {
    db.run(
      'UPDATE translation_values SET text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [text, id],
    );
    return db.get('SELECT * FROM translation_values WHERE id = ?', [id]);
  },

  deleteTranslationValue: async (id) =>
    db.run('DELETE FROM translation_values WHERE id = ?', [id]),

  getProjectTranslations: async (project_id) =>
    db.all(
      `SELECT t.id, t.key, t.project_id, v.lang, v.text
       FROM translations t
       LEFT JOIN translation_values v ON t.id = v.translation_id
       WHERE t.project_id = ?
       ORDER BY t.key, v.lang`,
      [project_id],
    ),
};

module.exports = Translation;
