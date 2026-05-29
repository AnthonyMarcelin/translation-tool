const db = require('../db-better');
const multer = require('multer');
const yaml = require('js-yaml');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function getProjectFromApiKey(req, res) {
  if (!req.apiKey) return null;
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.apiKey.project_id);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return null; }
  return project;
}

function buildFlatJson(projectId, lang) {
  const rows = db.prepare(`
    SELECT t.key, v.text FROM translations t
    JOIN translation_values v ON v.translation_id=t.id
    WHERE t.project_id=? AND v.lang=?
    ORDER BY t.key
  `).all(projectId, lang);
  const result = {};
  rows.forEach(r => { result[r.key] = r.text; });
  return result;
}

function buildNestedJson(flat) {
  const result = {};
  Object.entries(flat).forEach(([key, value]) => {
    const parts = key.split('.');
    let obj = result;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) { obj[part] = value; }
      else { obj[part] = obj[part] || {}; obj = obj[part]; }
    });
  });
  return result;
}

function handleImport(projectId, userId, req, res) {
  const { lang, strategy = 'merge' } = req.body;
  if (!lang) return res.status(400).json({ error: 'lang required' });
  if (!['merge','replace','skip'].includes(strategy)) return res.status(400).json({ error: 'Invalid strategy' });

  let data = {};

  if (req.file) {
    const content = req.file.buffer.toString('utf-8');
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    try {
      if (ext === 'yaml' || ext === 'yml') data = yaml.load(content);
      else if (ext === 'csv') {
        const lines = content.split('\n').slice(1);
        lines.forEach(line => {
          const [key, value] = line.split(',').map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
          if (key && value !== undefined) data[key] = value;
        });
      } else data = JSON.parse(content);
    } catch (e) {
      return res.status(400).json({ error: `Could not parse file: ${e.message}` });
    }
  } else if (req.body.data) {
    try { data = JSON.parse(req.body.data); } catch { return res.status(400).json({ error: 'Invalid JSON in data field' }); }
  } else {
    return res.status(400).json({ error: 'file or data required' });
  }

  // Flatten nested JSON
  function flattenObj(obj, prefix = '') {
    const result = {};
    Object.entries(obj).forEach(([k, v]) => {
      const newKey = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        Object.assign(result, flattenObj(v, newKey));
      } else {
        result[newKey] = String(v);
      }
    });
    return result;
  }
  const flat = flattenObj(data);

  let created = 0, updated = 0, skipped = 0;

  if (strategy === 'replace') {
    db.prepare('DELETE FROM translation_values WHERE lang=? AND translation_id IN (SELECT id FROM translations WHERE project_id=?)').run(lang, projectId);
  }

  Object.entries(flat).forEach(([key, text]) => {
    let t = db.prepare('SELECT id FROM translations WHERE project_id=? AND key=?').get(projectId, key);
    if (!t) {
      const r = db.prepare('INSERT INTO translations (project_id, key) VALUES (?,?)').run(projectId, key);
      t = { id: r.lastInsertRowid };
      created++;
    }

    const existing = db.prepare('SELECT id FROM translation_values WHERE translation_id=? AND lang=?').get(t.id, lang);
    if (existing) {
      if (strategy === 'skip') { skipped++; return; }
      db.prepare('UPDATE translation_values SET text=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(text, userId, existing.id);
      updated++;
    } else {
      db.prepare('INSERT INTO translation_values (translation_id, lang, text, updated_by) VALUES (?,?,?,?)').run(t.id, lang, text, userId);
      updated++;
    }
  });

  // Ensure lang is in project_languages
  db.prepare('INSERT OR IGNORE INTO project_languages (project_id, lang_code) VALUES (?,?)').run(projectId, lang);

  res.json({ created, updated, skipped, total: Object.keys(flat).length });
}

module.exports = { upload, getProjectFromApiKey, buildFlatJson, buildNestedJson, handleImport };
