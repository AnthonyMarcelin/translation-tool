import { useApp } from '../context/AppContext';
import { LANGUAGES } from '../constants';

export const useFilters = () => {
  const {
    translations: rawTranslations,
    selectedLanguages: rawSelectedLanguages,
    searchTerm,
    filter,
    sort,
  } = useApp();

  const translations = Array.isArray(rawTranslations) ? rawTranslations : [];
  const selectedLanguages = Array.isArray(rawSelectedLanguages)
    ? rawSelectedLanguages
    : ['fr', 'en'];

  const filteredTranslations = translations.filter((translation) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesKey = translation.key?.toLowerCase().includes(searchLower);
      const matchesValue = Object.values(translation.values || {}).some(
        (value) => value?.toLowerCase().includes(searchLower),
      );
      if (!matchesKey && !matchesValue) return false;
    }

    // Filtre par statut
    if (filter === 'missing') {
      return selectedLanguages.some((lang) => !translation.values?.[lang]);
    } else if (filter === 'completed') {
      return selectedLanguages.every((lang) => translation.values?.[lang]);
    }

    return true;
  });

  const sortedTranslations = [...filteredTranslations].sort((a, b) => {
    switch (sort) {
      case 'key':
        return a.key?.localeCompare(b.key) || 0;
      case 'created':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'updated':
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
