const axios = require('axios');
const Translation = require('../models/translation.model');

const TranslationService = {
  translateText: async ({ text, source, target, translation_id }) => {
    try {
      const response = await axios.post(
        'http://libretranslate:5000/translate',
        {
          q: text,
          source,
          target,
          format: 'text',
        },
      );

      const translatedText = response.data.translatedText;

      if (translation_id) {
        const translation = await Translation.addTranslationValue({
          translation_id,
          lang: target,
          text: translatedText,
        });
        return { ...translation, translatedText };
      }

      return { translatedText, lang: target, text: translatedText };
    } catch (error) {
      console.error('Translation error:', error.message);
      throw new Error(error.message || 'Translation failed');
    }
  },

  updateValueAndRetranslate: async ({ translationId, lang, newText }) => {
    await Translation.addTranslationValue({
      translation_id: translationId,
      lang,
      text: newText,
    });

    const values = await Translation.getTranslationValues(translationId);

    const targetLangs = values.map((v) => v.lang).filter((l) => l !== lang);
    const results = [];

    for (const target of targetLangs) {
      const translated = await TranslationService.translateText({
        text: newText,
        source: lang,
        target,
        translation_id: translationId,
      });
      results.push(translated);
    }

    return results;
  },

  exportProjectTranslations: async (project) => {
    const translations = await Translation.getProjectTranslations(project);
    const result = {};
    translations.forEach((row) => {
      if (!result[row.key]) result[row.key] = {};
      if (row.lang) result[row.key][row.lang] = row.text;
    });
    return result;
  },
};

module.exports = TranslationService;
