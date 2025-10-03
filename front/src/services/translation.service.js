import {
  ENDPOINTS,
  DEFAULT_HEADERS,
  handleResponse,
} from '../config/api.config';

export const TranslationService = {
  async fetchTranslations(project) {
    if (!project) return [];

    const response = await fetch(
      `${ENDPOINTS.TRANSLATIONS.BASE}?project=${project}`,
    );
    const translations = await handleResponse(response);

    const translationsWithValues = await Promise.all(
      translations.map(async (translation) => {
        const valuesResponse = await fetch(
          ENDPOINTS.TRANSLATIONS.VALUES(translation.id),
        );
        const values = await handleResponse(valuesResponse);

        const valuesByLang = values.reduce(
          (acc, val) => ({
            ...acc,
            [val.lang]: val.text,
          }),
          {},
        );

        return {
          ...translation,
          values: valuesByLang,
        };
      }),
    );

    return translationsWithValues;
  },

  async createTranslation(key, project) {
    const response = await fetch(ENDPOINTS.TRANSLATIONS.BASE, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ key, project }),
    });
    return handleResponse(response);
  },

  async addTranslationValue(translationId, lang, text) {
    const response = await fetch(ENDPOINTS.TRANSLATIONS.VALUES(translationId), {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ lang, text }),
    });
    return handleResponse(response);
  },

  async deleteTranslation(translationId) {
    const response = await fetch(ENDPOINTS.TRANSLATIONS.BY_ID(translationId), {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  async autoTranslate(text, sourceLang, targetLang, translationId) {
    const response = await fetch(ENDPOINTS.TRANSLATE, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        text,
        source: sourceLang,
        target: targetLang,
        translation_id: translationId,
      }),
    });
    return handleResponse(response);
  },

  async updateTranslationValue(valueId, text) {
    const response = await fetch(ENDPOINTS.VALUES.BY_ID(valueId), {
      method: 'PUT',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ text }),
    });
    return handleResponse(response);
  },

  async getTranslationValues(translationId) {
    const response = await fetch(ENDPOINTS.TRANSLATIONS.VALUES(translationId));
    return handleResponse(response);
  },
};

export default TranslationService;
