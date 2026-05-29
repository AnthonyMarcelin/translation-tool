const express = require('express');
const db = require('../db-better');
const { canAccessProject, canManageProject } = require('../helpers/roles');

const router = express.Router();

router.get('/projects/:id/translations', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });

  const { search, page = 1, limit = 100, lang, status, sort = 'key', order = 'asc' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const validSorts = { key: 't.key', created_at: 't.created_at', updated_at: 't.updated_at' };
  const sortCol = validSorts[sort] || 't.key';
  const sortDir = order === 'desc' ? 'DESC' : 'ASC';

  let where = 'WHERE t.project_id=?';
  const params = [project.id];

  if (search?.trim()) {
    where += ` AND (t.key LIKE ? OR EXISTS (
      SELECT 1 FROM translation_values v WHERE v.translation_id=t.id AND v.text LIKE ?
    ))`;
    const q = `%${search.trim()}%`;
    params.push(q, q);
  }

  if (lang && status) {
    where += ` AND EXISTS (SELECT 1 FROM translation_values v WHERE v.translation_id=t.id AND v.lang=? AND v.status=?)`;
    params.push(lang, status);
  }

  const total = db.prepare(`SELECT COUNT(*) as c FROM translations t ${where}`).get(...params).c;
  const translations = db.prepare(`SELECT t.* FROM translations t ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);

  // Load values for each translation
  const result = translations.map(t => {
    const values = db.prepare('SELECT * FROM translation_values WHERE translation_id=?').all(t.id);
    const byLang = {};
    const statusByLang = {};
    const idsByLang = {};
    values.forEach(v => {
      byLang[v.lang] = v.text;
      statusByLang[v.lang] = v.status;
      idsByLang[v.lang] = v.id;
    });
    return { ...t, values: byLang, statuses: statusByLang, value_ids: idsByLang };
  });

  res.json({ data: result, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
});

router.post('/projects/:id/translations', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });

  const { key, description = '' } = req.body;
  if (!key?.trim()) return res.status(400).json({ error: 'key required' });

  try {
    const r = db.prepare('INSERT INTO translations (project_id, key, description) VALUES (?,?,?)').run(project.id, key.trim(), description);
    res.status(201).json(db.prepare('SELECT * FROM translations WHERE id=?').get(r.lastInsertRowid));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Key already exists in this project' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/translations/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM translations WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, t.project_id)) return res.status(403).json({ error: 'Access denied' });
  const { key, description } = req.body;
  if (key) {
    try {
      db.prepare('UPDATE translations SET key=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(key.trim(), t.id);
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Key already exists' });
      return res.status(500).json({ error: e.message });
    }
  }
  if (description !== undefined) db.prepare('UPDATE translations SET description=? WHERE id=?').run(description, t.id);
  res.json(db.prepare('SELECT * FROM translations WHERE id=?').get(t.id));
});

router.delete('/translations/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM translations WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, t.project_id)) return res.status(403).json({ error: 'Access denied' });
  db.prepare('DELETE FROM translations WHERE id=?').run(t.id);
  res.json({ deleted: true });
});

router.get('/translations/:id/values', (req, res) => {
  const t = db.prepare('SELECT * FROM translations WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, t.project_id)) return res.status(403).json({ error: 'Access denied' });
  res.json(db.prepare('SELECT * FROM translation_values WHERE translation_id=?').all(t.id));
});

router.post('/translations/:id/values', (req, res) => {
  const t = db.prepare('SELECT * FROM translations WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, t.project_id)) return res.status(403).json({ error: 'Access denied' });

  const { lang, text } = req.body;
  if (!lang || text === undefined) return res.status(400).json({ error: 'lang and text required' });

  const existing = db.prepare('SELECT id FROM translation_values WHERE translation_id=? AND lang=?').get(t.id, lang);
  if (existing) {
    db.prepare('UPDATE translation_values SET text=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(text, req.user.id, existing.id);
    db.prepare('UPDATE translations SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(t.id);
    res.json(db.prepare('SELECT * FROM translation_values WHERE id=?').get(existing.id));
  } else {
    const r = db.prepare('INSERT INTO translation_values (translation_id, lang, text, updated_by) VALUES (?,?,?,?)').run(t.id, lang, text, req.user.id);
    db.prepare('UPDATE translations SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(t.id);
    res.status(201).json(db.prepare('SELECT * FROM translation_values WHERE id=?').get(r.lastInsertRowid));
  }
});

router.put('/values/:id', (req, res) => {
  const v = db.prepare('SELECT tv.*, t.project_id FROM translation_values tv JOIN translations t ON t.id=tv.translation_id WHERE tv.id=?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, v.project_id)) return res.status(403).json({ error: 'Access denied' });

  const { text, status } = req.body;
  if (text !== undefined) db.prepare('UPDATE translation_values SET text=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(text, req.user.id, v.id);
  if (status) {
    if (!['draft','reviewed','approved'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (status === 'approved' && !canManageProject(req.user.id, v.project_id)) {
      return res.status(403).json({ error: 'Only manager+ can approve translations' });
    }
    db.prepare('UPDATE translation_values SET status=? WHERE id=?').run(status, v.id);
  }
  db.prepare('UPDATE translations SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(v.translation_id);
  res.json(db.prepare('SELECT * FROM translation_values WHERE id=?').get(v.id));
});

router.delete('/values/:id', (req, res) => {
  const v = db.prepare('SELECT tv.*, t.project_id FROM translation_values tv JOIN translations t ON t.id=tv.translation_id WHERE tv.id=?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, v.project_id)) return res.status(403).json({ error: 'Access denied' });
  db.prepare('DELETE FROM translation_values WHERE id=?').run(v.id);
  res.json({ deleted: true });
});

router.post('/projects/:id/translations/bulk-delete', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM translations WHERE id IN (${placeholders}) AND project_id=?`).run(...ids, project.id);
  res.json({ deleted: ids.length });
});

router.post('/projects/:id/translations/bulk-status', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canManageProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });

  const { ids, lang, status } = req.body;
  if (!Array.isArray(ids) || !lang || !status) return res.status(400).json({ error: 'ids, lang, status required' });
  if (!['draft','reviewed','approved'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE translation_values SET status=?
    WHERE lang=? AND translation_id IN (
      SELECT id FROM translations WHERE id IN (${placeholders}) AND project_id=?
    )
  `).run(status, lang, ...ids, project.id);
  res.json({ updated: ids.length });
});

module.exports = router;
