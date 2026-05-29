const express = require('express');
const axios = require('axios');
const db = require('../db-better');
const { LIBRE_URL } = require('../config');
const { canAccessProject } = require('../helpers/roles');

const router = express.Router();

router.post('/translate', async (req, res) => {
  const { text, source, target, translation_id } = req.body;
  if (!text || !source || !target) return res.status(400).json({ error: 'text, source, target required' });

  try {
    const response = await axios.post(`${LIBRE_URL}/translate`, { q: text, source, target, format: 'text' });
    const translated = response.data?.translatedText;
    if (typeof translated !== 'string') {
      return res.status(502).json({ error: 'Translation service returned an unexpected response' });
    }

    if (translation_id) {
      const t = db.prepare('SELECT * FROM translations WHERE id=?').get(translation_id);
      if (t && canAccessProject(req.user.id, t.project_id)) {
        const existing = db.prepare('SELECT id FROM translation_values WHERE translation_id=? AND lang=?').get(translation_id, target);
        if (existing) {
          db.prepare('UPDATE translation_values SET text=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(translated, req.user.id, existing.id);
        } else {
          db.prepare('INSERT INTO translation_values (translation_id, lang, text, updated_by) VALUES (?,?,?,?)').run(translation_id, target, translated, req.user.id);
        }
        db.prepare('UPDATE translations SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(translation_id);
      }
    }

    res.json({ translatedText: translated, lang: target, text: translated });
  } catch (error) {
    console.error('LibreTranslate error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
