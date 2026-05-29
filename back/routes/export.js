const express = require('express');
const archiver = require('archiver');
const yaml = require('js-yaml');
const db = require('../db-better');
const { canAccessProject } = require('../helpers/roles');
const { buildFlatJson, buildNestedJson, handleImport, upload } = require('../helpers/formats');

const router = express.Router();

router.get('/projects/:id/export/zip', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });

  const langs = db.prepare('SELECT lang_code FROM project_languages WHERE project_id=?').all(project.id).map(l => l.lang_code);
  const archive = archiver('zip', { zlib: { level: 9 } });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${project.slug}-translations.zip"`);
  archive.pipe(res);
  langs.forEach(lang => {
    archive.append(JSON.stringify(buildFlatJson(project.id, lang), null, 2), { name: `${lang}.json` });
  });
  archive.finalize();
});

router.get('/projects/:id/export/:lang', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Access denied' });
  const { format = 'flat_json' } = req.query;
  const flat = buildFlatJson(project.id, req.params.lang);
  if (format === 'nested_json') return res.json(buildNestedJson(flat));
  if (format === 'yaml') { res.setHeader('Content-Type', 'text/yaml'); return res.send(yaml.dump(flat)); }
  res.json(flat);
});

router.post('/projects/:id/import', upload.single('file'), (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, project.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  handleImport(project.id, req.user.id, req, res);
});

router.get('/export/key/:id', (req, res) => {
  const t = db.prepare('SELECT project_id FROM translations WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (!canAccessProject(req.user.id, t.project_id)) return res.status(403).json({ error: 'Access denied' });
  const rows = db.prepare('SELECT lang, text FROM translation_values WHERE translation_id=?').all(req.params.id);
  const result = {};
  rows.forEach(r => { result[r.lang] = r.text; });
  res.json(result);
});

module.exports = router;
