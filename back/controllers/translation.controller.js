const Translation = require('../models/translation.model');
const TranslationService = require('../services/translation.service');

const TranslationController = {
  translate: async (req, res, next) => {
    try {
      const { text, source, target, translation_id } = req.body;
      const result = await TranslationService.translateText({
        text,
        source,
        target,
        translation_id,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  createTranslation: async (req, res, next) => {
    try {
      const { key, project_id } = req.body;
      if (!key || !project_id)
        return res.status(400).json({ error: 'Key and project_id required' });
      const translation = await Translation.create({ key, project_id });
      res.status(201).json(translation);
    } catch (err) {
      next(err);
    }
  },

  getTranslation: async (req, res, next) => {
    try {
      const { id } = req.params;
      const translation = await Translation.findById(id);
      if (!translation) return res.status(404).json({ error: 'Not found' });
      res.json(translation);
    } catch (err) {
      next(err);
    }
  },

  updateTranslation: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { key, project_id } = req.body;
      const updated = await Translation.update(id, { key, project_id });

      const currentValues = await Translation.getTranslationValues(id);

      const fullUpdated = {
        id: updated.id,
        key: updated.key,
        project: updated.project_id,
        values: currentValues.reduce((acc, value) => {
          acc[value.lang] = value.text;
          return acc;
        }, {}),
      };

      res.json(fullUpdated);
    } catch (err) {
      next(err);
    }
  },

  deleteTranslation: async (req, res, next) => {
    try {
      const { id } = req.params;
      await Translation.delete(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  getTranslationValues: async (req, res, next) => {
    try {
      const { id } = req.params;
      const values = await Translation.getTranslationValues(id);
      res.json(values);
    } catch (err) {
      next(err);
    }
  },

  addTranslationValue: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { lang, text } = req.body;
      const value = await Translation.addTranslationValue({
        translation_id: id,
        lang,
        text,
      });
      res.status(201).json(value);
    } catch (err) {
      next(err);
    }
  },

  updateTranslationValue: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { text, lang, autoTranslate } = req.body;

      let updatedTranslations;
      if (autoTranslate) {
        updatedTranslations =
          await TranslationService.updateValueAndRetranslate({
            translationId: id,
            lang,
            newText: text,
          });
      } else {
        await Translation.addTranslationValue({
          translation_id: id,
          lang,
          text,
        });
      }

      res.json({ updated: updatedTranslations || { id, lang, text } });
    } catch (err) {
      next(err);
    }
  },

  deleteTranslationValue: async (req, res, next) => {
    try {
      const { id } = req.params;
      await Translation.deleteTranslationValue(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  getTranslationsByProject: async (req, res, next) => {
    try {
      const { project_id } = req.query;
      if (!project_id)
        return res.status(400).json({ error: 'project_id required' });
      const translations = await Translation.getProjectTranslations(project_id);

      const groupedTranslations = translations.reduce((acc, row) => {
        const { id, key, project_id } = row;

        if (!acc[id]) {
          acc[id] = {
            id,
            key,
            project: project_id,
            values: {},
          };
        }

        if (row.lang && row.text) {
          acc[id].values[row.lang] = row.text;
        }

        return acc;
      }, {});

      const result = Object.values(groupedTranslations);

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  exportProjectTranslations: async (req, res, next) => {
    try {
      const { project_id } = req.query;
      const { languages } = req.query;

      if (!project_id)
        return res.status(400).json({ error: 'project_id required' });

      const translations = await Translation.getProjectTranslations(project_id);

      const groupedTranslations = translations.reduce((acc, row) => {
        const { id, key, project_id } = row;

        if (!acc[id]) {
          acc[id] = {
            id,
            key,
            project: project_id,
            values: {},
          };
        }

        if (row.lang && row.text) {
          acc[id].values[row.lang] = row.text;
        }

        return acc;
      }, {});

      const result = Object.values(groupedTranslations);

      let filteredResult = result;
      if (languages) {
        const selectedLanguages = languages.split(',');
        filteredResult = result.map((translation) => ({
          ...translation,
          values: Object.keys(translation.values)
            .filter((lang) => selectedLanguages.includes(lang))
            .reduce((acc, lang) => {
              acc[lang] = translation.values[lang];
              return acc;
            }, {}),
        }));
      }

      const Project = require('../models/project.model');
      const project = await Project.findById(project_id);

      const exportData = {
        project_name: project ? project.name : `Project ${project_id}`,
        languages: languages ? languages.split(',') : [],
        translations: filteredResult.reduce((acc, translation) => {
          const { id, project, ...translationData } = translation;
          acc[translation.key] = translationData;
          return acc;
        }, {}),
        exported_at: new Date().toISOString(),
      };

      res.json(exportData);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = TranslationController;
