const db = require('../config/database');

const Project = {
  create: async (name) => {
    const result = await db.run('INSERT INTO projects (name) VALUES (?)', [
      name,
    ]);
    return { id: result.lastID, name };
  },

  findById: async (id) => db.get('SELECT * FROM projects WHERE id = ?', [id]),

  findByName: async (name) =>
    db.get('SELECT * FROM projects WHERE name = ?', [name]),

  getAll: async () => db.all('SELECT * FROM projects ORDER BY name ASC'),

  update: async (id, newName) => {
    await db.run(
      'UPDATE projects SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newName, id],
    );
    return { id, name: newName };
  },

  delete: async (id) => {
    await db.transaction(() => {
      const translations = db.all(
        'SELECT id FROM translations WHERE project_id = ?',
        [id],
      );
      const ids = translations.map((t) => t.id);
      if (ids.length) {
        db.run(
          `DELETE FROM translation_values WHERE translation_id IN (${ids
            .map(() => '?')
            .join(',')})`,
          ids,
        );
        db.run(`DELETE FROM translations WHERE project_id = ?`, [id]);
      }
      db.run('DELETE FROM projects WHERE id = ?', [id]);
    });
  },
};

module.exports = Project;
