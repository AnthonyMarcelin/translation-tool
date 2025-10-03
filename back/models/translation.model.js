const db = require('../config/database');

const Translation = {
  create: async ({ key, project }) => {
    const result = await db.run(
      'INSERT INTO translations (key, project, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [key, project],
    );
    return { id: result.lastID, key, project };
  },

  findById: async (id) =>
    db.get('SELECT * FROM translations WHERE id = ?', [id]),

  findByProject: async (project) =>
    db.all('SELECT * FROM translations WHERE project = ? ORDER BY key ASC', [
      project,
    ]),

  update: async (id, { key, project }) => {
    await db.run(
      'UPDATE translations SET key = ?, project = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [key, project, id],
    );
    return { id, key, project };
  },

  delete: async (id) => {
    await db.run('DELETE FROM translations WHERE id = ?', [id]);
    await db.run('DELETE FROM translation_values WHERE translation_id = ?', [
      id,
    ]);
  },

  getTranslationValues: async (translationId) => {
    const rows = await db.all(
      'SELECT * FROM translation_values WHERE translation_id = ?',
      [translationId],
    );
    return Array.isArray(rows) ? rows : [];
  },

  addTranslationValue: async ({ translation_id, lang, text }) => {
    await db.run(
      'INSERT OR REPLACE INTO translation_values (translation_id, lang, text, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [translation_id, lang, text],
    );
    return db.get(
      'SELECT * FROM translation_values WHERE translation_id = ? AND lang = ?',
      [translation_id, lang],
    );
  },

  updateTranslationValue: async (id, text) => {
    await db.run(
      'UPDATE translation_values SET text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [text, id],
    );
    return db.get('SELECT * FROM translation_values WHERE id = ?', [id]);
  },

  deleteTranslationValue: async (id) => {
    await db.run('DELETE FROM translation_values WHERE id = ?', [id]);
  },

  getProjectTranslations: async (project) =>
    db.all(
      `SELECT t.id, t.key, t.project, v.lang, v.text
       FROM translations t
       LEFT JOIN translation_values v ON t.id = v.translation_id
       WHERE t.project = ?
       ORDER BY t.key, v.lang`,
      [project],
    ),
};

module.exports = Translation;
