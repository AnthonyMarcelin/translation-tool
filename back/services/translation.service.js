const axios = require('axios');
const Translation = require('../models/translation.model');

const TranslationService = {
  translateText: async ({ text, source, target, translation_id }) => {
    if (!text || !source || !target)
      throw new Error('Text, source, and target are required');

    const response = await axios.post(
      'http://libretranslate:5000/translate',
      { q: text, source, target, format: 'text' },
      { timeout: 5000 },
    );

    const translatedText = response.data.translatedText;

    if (translation_id) {
      await Translation.addTranslationValue({
        translation_id,
        lang: target,
        text: translatedText,
      });
    }

    return { translatedText, lang: target, text: translatedText };
  },

  updateValueAndRetranslate: async ({ translationId, lang, newText }) => {
    await Translation.addTranslationValue({
      translation_id: translationId,
      lang,
      text: newText,
    });

    const values = await Translation.getTranslationValues(translationId);
    const targetLangs = values.map((v) => v.lang).filter((l) => l !== lang);

    const results = await Promise.all(
      targetLangs.map((target) =>
        TranslationService.translateText({
          text: newText,
          source: lang,
          target,
          translation_id: translationId,
        }),
      ),
    );

    return results;
  },

  exportProjectTranslations: async (project_id) => {
    const rows = await Translation.getProjectTranslations(project_id);
    const result = {};
    rows.forEach((row) => {
      if (!result[row.key]) result[row.key] = {};
      if (row.lang) result[row.key][row.lang] = row.text;
    });
    return result;
  },
};

module.exports = TranslationService;
