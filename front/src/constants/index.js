export const LANGUAGES = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

export const FILTER_OPTIONS = [
  { value: "all", label: "Toutes les clés" },
  { value: "missing", label: "Traductions manquantes" },
  { value: "completed", label: "Traductions complètes" },
];

export const SORT_OPTIONS = [
  { value: "key", label: "Par clé" },
  { value: "created", label: "Par date de création" },
  { value: "updated", label: "Par dernière modification" },
];

export const VIEW_MODES = [
  { value: "table", label: "Tableau", icon: "📊" },
  { value: "cards", label: "Cartes", icon: "🗃️" },
];
