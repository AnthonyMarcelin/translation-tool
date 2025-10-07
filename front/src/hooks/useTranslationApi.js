import { useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import TranslationService from '../services/translation.service';
import { ENDPOINTS, DEFAULT_HEADERS } from '../config/api.config';

export const useTranslationApi = () => {
  const { actions } = useApp();

  const fetchTranslations = useCallback(
    async (projectId) => {
      if (!projectId) return;

      actions.setLoading(true);
      try {
        const translations = await TranslationService.fetchTranslations(
          projectId,
        );
        actions.setTranslations(translations);
        return translations;
      } catch (error) {
        console.error('Error fetching translations:', error);
        throw error;
      } finally {
        actions.setLoading(false);
      }
    },
    [actions],
  );

  const createTranslation = useCallback(
    async (key, projectId) => {
      if (!key || !projectId) {
        throw new Error('Key and project ID are required');
      }

      try {
        const translation = await TranslationService.createTranslation(
          key,
          projectId,
        );
        actions.addTranslation({
          ...translation,
          values: {},
        });
        return translation;
      } catch (error) {
        console.error('Error creating translation:', error);
        throw error;
      }
    },
    [actions],
  );

  const addTranslationValue = useCallback(
    async (translationId, lang, text) => {
      try {
        const value = await TranslationService.addTranslationValue(
          translationId,
          lang,
          text,
        );
        actions.updateTranslationValue(translationId, lang, text);
        return value;
      } catch (error) {
        console.error('Error adding translation value:', error);
        throw error;
      }
    },
    [actions],
  );

  const updateTranslation = useCallback(
    async (translationId, newKey, projectId) => {
      try {
        const updated = await TranslationService.updateTranslation(
          translationId,
          newKey,
          projectId,
        );
        actions.updateTranslation(updated);
        return updated;
      } catch (error) {
        console.error('Error updating translation:', error);
        throw error;
      }
    },
    [actions],
  );

  const deleteTranslation = useCallback(
    async (translationId) => {
      try {
        await TranslationService.deleteTranslation(translationId);
        actions.removeTranslation(translationId);
      } catch (error) {
        console.error('Error deleting translation:', error);
        throw error;
      }
    },
    [actions],
  );

  const autoTranslate = useCallback(
    async (text, targetLang, sourceLang = 'fr', translationId = null) => {
      try {
        return await TranslationService.autoTranslate(
          text,
          targetLang,
          sourceLang,
          translationId,
        );
      } catch (error) {
        console.error('Error during auto-translation:', error);
        throw error;
      }
    },
    [],
  );

  const updateTranslationValue = useCallback(
    async (translationId, lang, text, autoTranslate = false) => {
      try {
        const result = await TranslationService.updateTranslationValue(
          translationId,
          lang,
          text,
          autoTranslate,
        );
        actions.updateTranslationValue(translationId, lang, text);
        return result;
      } catch (error) {
        console.error('Error updating translation value:', error);
        throw error;
      }
    },
    [actions],
  );

  const deleteTranslationValue = useCallback(async (valueId) => {
    try {
      await TranslationService.deleteTranslationValue(valueId);
      actions.removeTranslationValue(valueId);
    } catch (error) {
      console.error('Error deleting translation value:', error);
      throw error;
    }
  }, []);

  const exportTranslations = useCallback(
    async (projectId, selectedLanguages = []) => {
      try {
        const languagesParam =
          selectedLanguages.length > 0 ? selectedLanguages.join(',') : '';
        const url = languagesParam
          ? `${ENDPOINTS.TRANSLATIONS.BASE}/export?project_id=${projectId}&languages=${languagesParam}`
          : `${ENDPOINTS.TRANSLATIONS.BASE}/export?project_id=${projectId}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: DEFAULT_HEADERS,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `translations_${data.project_name}_${
          new Date().toISOString().split('T')[0]
        }.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        return data;
      } catch (error) {
        console.error('Error exporting translations:', error);
        throw error;
      }
    },
    [],
  );

  return useMemo(
    () => ({
      fetchTranslations,
      createTranslation,
      addTranslationValue,
      updateTranslation,
      updateTranslationValue,
      deleteTranslation,
      deleteTranslationValue,
      autoTranslate,
      exportTranslations,
    }),
    [
      fetchTranslations,
      createTranslation,
      addTranslationValue,
      updateTranslation,
      updateTranslationValue,
      deleteTranslation,
      deleteTranslationValue,
      autoTranslate,
      exportTranslations,
    ],
  );
};

export default useTranslationApi;
