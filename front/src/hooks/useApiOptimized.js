import { useCallback, useMemo } from "react";
import { useApp } from "../context/AppContext";

const API = "/api";

export const useApi = () => {
  const { dispatch, actions, projects } = useApp();

  // Fonctions mémorisées pour éviter les re-renders
  const fetchProjects = useCallback(async () => {
    dispatch({ type: actions.SET_LOADING, payload: true });
    try {
      const response = await fetch(`${API}/translations`);
      const data = await response.json();
      const uniqueProjects = [...new Set(data.map((t) => t.project))].filter(
        Boolean,
      );
      dispatch({ type: actions.SET_PROJECTS, payload: uniqueProjects });
      return uniqueProjects;
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    } finally {
      dispatch({ type: actions.SET_LOADING, payload: false });
    }
  }, [dispatch, actions]);

  const createProject = useCallback(
    async (projectName) => {
      dispatch({
        type: actions.SET_PROJECTS,
        payload: [...projects, projectName],
      });
      dispatch({ type: actions.SET_CURRENT_PROJECT, payload: projectName });
    },
    [dispatch, actions, projects],
  );

  const deleteProject = useCallback(
    async (projectName) => {
      try {
        await fetch(`${API}/projects/${projectName}`, { method: "DELETE" });
        dispatch({
          type: actions.SET_PROJECTS,
          payload: projects.filter((p) => p !== projectName),
        });
        dispatch({ type: actions.SET_CURRENT_PROJECT, payload: "" });
        dispatch({ type: actions.SET_TRANSLATIONS, payload: [] });
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    },
    [dispatch, actions, projects],
  );

  const fetchTranslations = useCallback(
    async (project) => {
      if (!project) return;

      dispatch({ type: actions.SET_LOADING, payload: true });
      try {
        const response = await fetch(`${API}/translations?project=${project}`);
        const translations = await response.json();

        // Charger toutes les valeurs pour chaque traduction en parallèle
        const translationsWithValues = await Promise.all(
          translations.map(async (translation) => {
            const valuesResponse = await fetch(
              `${API}/translations/${translation.id}/values`,
            );
            const values = await valuesResponse.json();

            const valuesByLang = {};
            values.forEach((val) => {
              valuesByLang[val.lang] = val.text;
            });

            return {
              ...translation,
              values: valuesByLang,
            };
          }),
        );

        dispatch({
          type: actions.SET_TRANSLATIONS,
          payload: translationsWithValues,
        });
      } catch (error) {
        console.error("Error fetching translations:", error);
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
        // 1. Créer la clé
        const keyResponse = await fetch(`${API}/translations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, project }),
        });
        const keyData = await keyResponse.json();
        const translationId = keyData.id;

        // 2. Ajouter la valeur française
        await fetch(`${API}/translations/${translationId}/values`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang: "fr", text: frenchValue }),
        });

        // 3. Traduction automatique en parallèle (optimisé)
        const otherLanguages = selectedLanguages.filter(
          (lang) => lang !== "fr",
        );
        const values = { fr: frenchValue };

        const translationPromises = otherLanguages.map(async (targetLang) => {
          try {
            const translateResponse = await fetch(`${API}/translate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: frenchValue,
                source: "fr",
                target: targetLang,
                translation_id: translationId,
              }),
            });
            const translateResult = await translateResponse.json();
            values[targetLang] = translateResult.translatedText || "";
          } catch (error) {
            console.error(`Translation error for ${targetLang}:`, error);
            values[targetLang] = "";
          }
        });

        // Attendre toutes les traductions
        await Promise.all(translationPromises);

        // 4. Ajouter à l'état local
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
        console.error("Error creating translation:", error);
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
        // Optimisation : débounce les updates
        clearTimeout(updateTranslationValue.timeout);
        updateTranslationValue.timeout = setTimeout(async () => {
          try {
            const valuesResponse = await fetch(
              `${API}/translations/${translationId}/values`,
            );
            const existingValues = await valuesResponse.json();
            const existingValue = existingValues.find((v) => v.lang === lang);

            if (existingValue) {
              await fetch(`${API}/values/${existingValue.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: value }),
              });
            } else {
              await fetch(`${API}/translations/${translationId}/values`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lang, text: value }),
              });
            }
          } catch (error) {
            console.error("Error updating translation value:", error);
          }
        }, 500); // Débounce de 500ms

        // Mettre à jour l'état local immédiatement
        dispatch({
          type: actions.UPDATE_TRANSLATION_VALUE,
          payload: { translationId, lang, value },
        });
      } catch (error) {
        console.error("Error updating translation value:", error);
      }
    },
    [dispatch, actions],
  );

  const deleteTranslation = useCallback(
    async (translationId) => {
      try {
        await fetch(`${API}/translations/${translationId}`, {
          method: "DELETE",
        });
        dispatch({ type: actions.REMOVE_TRANSLATION, payload: translationId });
      } catch (error) {
        console.error("Error deleting translation:", error);
      }
    },
    [dispatch, actions],
  );

  const autoTranslate = useCallback(
    async (translationId, fromLang, toLang, text) => {
      try {
        const response = await fetch(`${API}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            source: fromLang,
            target: toLang,
            translation_id: translationId,
          }),
        });
        const result = await response.json();

        // Mettre à jour automatiquement
        await updateTranslationValue(
          translationId,
          toLang,
          result.translatedText || "",
        );

        return result.translatedText;
      } catch (error) {
        console.error("Auto-translation error:", error);
        return "";
      }
    },
    [updateTranslationValue],
  );

  const exportTranslations = useCallback(async (project, languages) => {
    try {
      const response = await fetch(
        `${API}/export/${project}?langs=${languages.join(",")}`,
      );
      const data = await response.json();

      // Télécharger les fichiers
      Object.entries(data).forEach(([lang, translations]) => {
        const blob = new Blob([JSON.stringify(translations, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${lang}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error("Export error:", error);
    }
  }, []);

  // Retourner un objet mémorisé
  return useMemo(
    () => ({
      fetchProjects,
      createProject,
      deleteProject,
      fetchTranslations,
      createTranslation,
      updateTranslationValue,
      deleteTranslation,
      autoTranslate,
      exportTranslations,
    }),
    [
      fetchProjects,
      createProject,
      deleteProject,
      fetchTranslations,
      createTranslation,
      updateTranslationValue,
      deleteTranslation,
      autoTranslate,
      exportTranslations,
    ],
  );
};
