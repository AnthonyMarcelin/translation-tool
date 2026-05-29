const express = require('express');
const yaml = require('js-yaml');
const archiver = require('archiver');
const db = require('../db-better');
const { requireAuth, requireApiKeyWrite } = require('../middleware/auth');
const { getProjectFromApiKey, buildFlatJson, buildNestedJson, handleImport, upload } = require('../helpers/formats');

const router = express.Router();

// CRITICAL: /v1/export/all and /v1/export/zip MUST be registered before /v1/export/:lang
router.get('/v1/export/all', requireAuth, (req, res) => {
  const project = getProjectFromApiKey(req, res);
  if (!project) return;
  const langs = db.prepare('SELECT lang_code FROM project_languages WHERE project_id=?').all(project.id).map(l => l.lang_code);
  const result = {};
  langs.forEach(lang => { result[lang] = buildFlatJson(project.id, lang); });
  res.json(result);
});

router.get('/v1/export/zip', requireAuth, (req, res) => {
  const project = getProjectFromApiKey(req, res);
  if (!project) return;
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

router.get('/v1/export/:lang', requireAuth, (req, res) => {
  const project = getProjectFromApiKey(req, res);
  if (!project) return;
  const { format = 'flat_json' } = req.query;
  const flat = buildFlatJson(project.id, req.params.lang);
  if (format === 'nested_json') return res.json(buildNestedJson(flat));
  if (format === 'yaml') { res.setHeader('Content-Type', 'text/yaml'); return res.send(yaml.dump(flat)); }
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    const lines = ['key,value', ...Object.entries(flat).map(([k, v]) => `"${k}","${v.replace(/"/g, '""')}"`)];

    return res.send(lines.join('\n'));
  }
  res.json(flat);
});

router.post('/v1/import', requireAuth, requireApiKeyWrite, upload.single('file'), (req, res) => {
  const project = getProjectFromApiKey(req, res);
  if (!project) return;
  handleImport(project.id, null, req, res);
});

module.exports = router;
