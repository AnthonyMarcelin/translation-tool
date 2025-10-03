import { useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import TranslationService from '../services/translation.service';

export const useTranslationApi = () => {
  const { dispatch, actions } = useApp();

  const fetchTranslations = useCallback(
    async (project) => {
      if (!project) return;

      dispatch({ type: actions.SET_LOADING, payload: true });
      try {
        const translations = await TranslationService.fetchTranslations(
          project,
        );
        dispatch({
          type: actions.SET_TRANSLATIONS,
          payload: translations,
        });
      } catch (error) {
        console.error('Error fetching translations:', error);
      } finally {
        dispatch({ type: actions.SET_LOADING, payload: false });
      }
    },
    [dispatch, actions],
  );

  const createTranslation = useCallback(
    async (key, frenchValue, project, selectedLanguages) => {
      dispatch({ type: actions.SET_LOADING, payload: true });
      try {
        const keyData = await TranslationService.createTranslation(
          key,
          project,
        );
        const translationId = keyData.id;

        await TranslationService.addTranslationValue(
          translationId,
          'fr',
          frenchValue,
        );

        const otherLanguages = selectedLanguages.filter(
          (lang) => lang !== 'fr',
        );
        const values = { fr: frenchValue };

        const translationPromises = otherLanguages.map(async (targetLang) => {
          try {
            const result = await TranslationService.autoTranslate(
              frenchValue,
              'fr',
              targetLang,
              translationId,
            );
            values[targetLang] = result.translatedText || '';
          } catch (error) {
            console.error(`Translation error for ${targetLang}:`, error);
            values[targetLang] = '';
          }
        });

        await Promise.all(translationPromises);

        const newTranslation = {
          id: translationId,
          key,
          project,
          values,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        dispatch({ type: actions.ADD_TRANSLATION, payload: newTranslation });
        return newTranslation;
      } catch (error) {
        console.error('Error creating translation:', error);
        throw error;
      } finally {
        dispatch({ type: actions.SET_LOADING, payload: false });
      }
    },
    [dispatch, actions],
  );

  const updateTranslationValue = useCallback(
    async (translationId, lang, value) => {
      try {
        clearTimeout(updateTranslationValue.timeout);
        updateTranslationValue.timeout = setTimeout(async () => {
          try {
            const existingValues =
              await TranslationService.getTranslationValues(translationId);
            const existingValue = existingValues.find((v) => v.lang === lang);

            if (existingValue) {
              await TranslationService.updateTranslationValue(
                existingValue.id,
                value,
              );
            } else {
              await TranslationService.addTranslationValue(
                translationId,
                lang,
                value,
              );
            }
          } catch (error) {
            console.error('Error updating translation value:', error);
          }
        }, 500);

        dispatch({
          type: actions.UPDATE_TRANSLATION_VALUE,
          payload: { translationId, lang, value },
        });
      } catch (error) {
        console.error('Error updating translation value:', error);
      }
    },
    [dispatch, actions],
  );

  const deleteTranslation = useCallback(
    async (translationId) => {
      try {
        await TranslationService.deleteTranslation(translationId);
        dispatch({ type: actions.REMOVE_TRANSLATION, payload: translationId });
      } catch (error) {
        console.error('Error deleting translation:', error);
      }
    },
    [dispatch, actions],
  );

  const autoTranslate = useCallback(
    async (translationId, fromLang, toLang, text) => {
      try {
        const result = await TranslationService.autoTranslate(
          text,
          fromLang,
          toLang,
          translationId,
        );

        await updateTranslationValue(
          translationId,
          toLang,
          result.translatedText || '',
        );

        return result.translatedText;
      } catch (error) {
        console.error('Auto-translation error:', error);
        return '';
      }
    },
    [updateTranslationValue],
  );

  return useMemo(
    () => ({
      fetchTranslations,
      createTranslation,
      updateTranslationValue,
      deleteTranslation,
      autoTranslate,
    }),
    [
      fetchTranslations,
      createTranslation,
      updateTranslationValue,
      deleteTranslation,
      autoTranslate,
    ],
  );
};
