import {
  ENDPOINTS,
  handleResponse,
  DEFAULT_HEADERS,
} from '../config/api.config';

export const TranslationService = {
  async fetchTranslations(projectId) {
    const response = await fetch(
      `${ENDPOINTS.TRANSLATIONS.BASE}?project_id=${projectId}`,
      {
        method: 'GET',
        headers: DEFAULT_HEADERS,
      },
    );
    return handleResponse(response);
  },

  async createTranslation(key, projectId) {
    const response = await fetch(ENDPOINTS.TRANSLATIONS.BASE, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ key, project_id: projectId }),
    });
    return handleResponse(response);
  },

  async addTranslationValue(translationId, lang, text) {
    const response = await fetch(
      `${ENDPOINTS.TRANSLATIONS.VALUES(translationId)}`,
      {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ lang, text }),
      },
    );
    return handleResponse(response);
  },

  async updateTranslation(translationId, newKey, projectId) {
    const response = await fetch(
      `${ENDPOINTS.TRANSLATIONS.BY_ID(translationId)}`,
      {
        method: 'PUT',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ key: newKey, project_id: projectId }),
      },
    );
    return handleResponse(response);
  },

  async deleteTranslation(translationId) {
    const response = await fetch(
      `${ENDPOINTS.TRANSLATIONS.BY_ID(translationId)}`,
      {
        method: 'DELETE',
        headers: DEFAULT_HEADERS,
      },
    );
    return handleResponse(response);
  },

  async autoTranslate(
    text,
    targetLang,
    sourceLang = 'fr',
    translationId = null,
  ) {
    try {
      const response = await fetch(ENDPOINTS.TRANSLATIONS.TRANSLATE, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          text,
          source: sourceLang,
          target: targetLang,
          translation_id: translationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await handleResponse(response);
      return result.translatedText || '';
    } catch (error) {
      console.warn('Translation service unavailable:', error.message);
      throw error;
    }
  },

  async updateTranslationValue(
    translationId,
    lang,
    text,
    autoTranslate = false,
  ) {
    const response = await fetch(
      `${ENDPOINTS.TRANSLATIONS.VALUES(translationId)}`,
      {
        method: 'PUT',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ lang, text, autoTranslate }),
      },
    );
    return handleResponse(response);
  },

  async deleteTranslationValue(valueId) {
    const response = await fetch(`${ENDPOINTS.TRANSLATIONS.VALUES(valueId)}`, {
      method: 'DELETE',
      headers: DEFAULT_HEADERS,
    });
    return handleResponse(response);
  },
};

export default TranslationService;
