import { useApp } from "../context/AppContext";
import { LANGUAGES } from "../constants";

export const useFilters = () => {
  const { translations, selectedLanguages, searchTerm, filter, sort } =
    useApp();

  const filteredTranslations = translations.filter((translation) => {
    // Filtre par terme de recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesKey = translation.key.toLowerCase().includes(searchLower);
      const matchesValue = Object.values(translation.values || {}).some(
        (value) => value.toLowerCase().includes(searchLower),
      );
      if (!matchesKey && !matchesValue) return false;
    }

    // Filtre par statut
    if (filter === "missing") {
      // Au moins une traduction manquante
      return selectedLanguages.some((lang) => !translation.values?.[lang]);
    } else if (filter === "completed") {
      // Toutes les traductions présentes
      return selectedLanguages.every((lang) => translation.values?.[lang]);
    }

    return true;
  });

  const sortedTranslations = [...filteredTranslations].sort((a, b) => {
    switch (sort) {
      case "key":
        return a.key.localeCompare(b.key);
      case "created":
        return new Date(b.created_at) - new Date(a.created_at);
      case "updated":
        return new Date(b.updated_at) - new Date(a.updated_at);
      default:
        return 0;
    }
  });

  const getTranslationStats = () => {
    const total = translations.length;
    const completed = translations.filter((t) =>
      selectedLanguages.every((lang) => t.values?.[lang]),
    ).length;
    const missing = total - completed;

    const completionPercentage =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    const languageStats = LANGUAGES.filter((lang) =>
      selectedLanguages.includes(lang.code),
    ).map((lang) => {
      const translatedCount = translations.filter(
        (t) => t.values?.[lang.code],
      ).length;
      const percentage =
        total > 0 ? Math.round((translatedCount / total) * 100) : 0;

      return {
        ...lang,
        translatedCount,
        total,
        percentage,
      };
    });

    return {
      total,
      completed,
      missing,
      completionPercentage,
      languageStats,
    };
  };

  return {
    filteredTranslations: sortedTranslations,
    stats: getTranslationStats(),
  };
};
