const Translation = require('../models/translation.model');
const archiver = require('archiver');

const ProjectController = {
  listProjects: async (req, res, next) => {
    try {
      const rows = await Translation.getAllProjects();
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },

  renameProject: async (req, res, next) => {
    try {
      const { oldName } = req.params;
      const { newName } = req.body;

      if (!newName || newName.trim() === '') {
        return res.status(400).json({ error: 'New project name is required' });
      }

      await Translation.renameProject(oldName, newName.trim());
      res.json({ oldName, newName: newName.trim() });
    } catch (err) {
      next(err);
    }
  },

  deleteProject: async (req, res, next) => {
    try {
      const { project } = req.params;
      const deleted = await Translation.deleteProject(project);
      res.json({ deleted });
    } catch (err) {
      next(err);
    }
  },

  exportProject: async (req, res, next) => {
    try {
      const { project } = req.params;
      const { langs } = req.query;

      const translations = await Translation.getProjectTranslations(project);

      const result = {};
      translations.forEach((row) => {
        if (!langs || langs.includes(row.lang)) {
          if (!result[row.lang]) result[row.lang] = {};
          result[row.lang][row.key] = row.text || '';
        }
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  exportProjectZip: async (req, res, next) => {
    try {
      const { project } = req.params;

      const translations = await Translation.getProjectTranslations(project);

      const translationsByLang = {};
      translations.forEach((row) => {
        if (!row.lang) return;
        if (!translationsByLang[row.lang]) translationsByLang[row.lang] = {};
        translationsByLang[row.lang][row.key] = row.text || '';
      });

      const archive = archiver('zip', { zlib: { level: 9 } });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${project}-translations.zip"`,
      );

      archive.pipe(res);

      Object.keys(translationsByLang).forEach((lang) => {
        archive.append(JSON.stringify(translationsByLang[lang], null, 2), {
          name: `${lang}.json`,
        });
      });

      archive.finalize();

      archive.on('error', (err) => {
        console.error('ZIP creation error:', err);
        res.status(500).json({ error: 'Error creating ZIP' });
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ProjectController;
