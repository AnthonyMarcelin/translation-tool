import { useApp } from "../context/AppContext";

export const usePersistence = () => {
  const { selectedLanguages, currentProject, viewMode } = useApp();

  // Sauvegarder automatiquement les préférences
  const savePreferences = () => {
    const preferences = {
      selectedLanguages,
      currentProject,
      viewMode,
      timestamp: Date.now(),
    };
    localStorage.setItem(
      "translationToolPreferences",
      JSON.stringify(preferences),
    );
  };

  // Restaurer les préférences
  const restorePreferences = () => {
    try {
      const saved = localStorage.getItem("translationToolPreferences");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Error restoring preferences:", error);
    }
    return null;
  };

  // Effacer les préférences
  const clearPreferences = () => {
    localStorage.removeItem("translationToolPreferences");
    localStorage.removeItem("selectedLanguages");
    localStorage.removeItem("currentProject");
    localStorage.removeItem("viewMode");
  };

  return {
    savePreferences,
    restorePreferences,
    clearPreferences,
  };
};
