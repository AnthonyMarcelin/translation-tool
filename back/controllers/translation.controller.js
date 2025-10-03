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
      const { key, project } = req.body;
      const translation = await Translation.create({ key, project });
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
      const { key, project } = req.body;
      const updated = await Translation.update(id, { key, project });
      res.json(updated);
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

      res.json({
        updated: updatedTranslations || { id, lang, text },
      });
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
      const { project } = req.query;
      const translations = await Translation.findByProject(project);
      res.json(translations);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = TranslationController;
