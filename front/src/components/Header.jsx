import { useApp } from "../context/AppContext";
import { useFilters } from "../hooks/useFilters";
import {
  LANGUAGES,
  FILTER_OPTIONS,
  SORT_OPTIONS,
  VIEW_MODES,
} from "../constants";
import "./Header.css";

const Header = () => {
  const {
    currentProject,
    selectedLanguages,
    searchTerm,
    filter,
    sort,
    viewMode,
    sidebarOpen,
    dispatch,
    actions,
  } = useApp();

  const { stats } = useFilters();

  const handleLanguageToggle = (langCode) => {
    const newLanguages = selectedLanguages.includes(langCode)
      ? selectedLanguages.filter((l) => l !== langCode)
      : [...selectedLanguages, langCode];

    // Garder au moins une langue
    if (newLanguages.length === 0) return;

    dispatch({ type: actions.SET_SELECTED_LANGUAGES, payload: newLanguages });
  };

  if (!currentProject) {
    return (
      <div className="header-empty">
        <div className="container">
          <button
            className="sidebar-toggle-btn"
            onClick={() => dispatch({ type: actions.TOGGLE_SIDEBAR })}
          >
            {sidebarOpen ? "✕" : "☰"}
          </button>
          <h1>Sélectionnez un projet pour commencer</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="header">
      <div className="container">
        {/* Ligne 1: Navigation et titre */}
        <div className="header-top">
          <div className="header-left">
            <button
              className="sidebar-toggle-btn"
              onClick={() => dispatch({ type: actions.TOGGLE_SIDEBAR })}
            >
              {sidebarOpen ? "✕" : "☰"}
            </button>
            <h1>📁 {currentProject}</h1>
          </div>

          <div className="header-right">
            <div className="stats-summary">
              <span className="stat">
                {stats.completed}/{stats.total} complètes (
                {stats.completionPercentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Ligne 2: Contrôles */}
        <div className="header-controls">
          {/* Recherche */}
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Rechercher des clés ou traductions..."
              value={searchTerm}
              onChange={(e) =>
                dispatch({
                  type: actions.SET_SEARCH_TERM,
                  payload: e.target.value,
                })
              }
              className="search-input"
            />
          </div>

          {/* Filtres */}
          <div className="filter-controls">
            <select
              value={filter}
              onChange={(e) =>
                dispatch({ type: actions.SET_FILTER, payload: e.target.value })
              }
              className="filter-select"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) =>
                dispatch({ type: actions.SET_SORT, payload: e.target.value })
              }
              className="filter-select"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="view-mode-toggle">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.value}
                  className={`view-btn ${
                    viewMode === mode.value ? "active" : ""
                  }`}
                  onClick={() =>
                    dispatch({
                      type: actions.SET_VIEW_MODE,
                      payload: mode.value,
                    })
                  }
                  title={mode.label}
                >
                  {mode.icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ligne 3: Sélection des langues */}
        <div className="language-selector">
          <span className="language-label">Langues :</span>
          <div className="language-chips">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`language-chip ${
                  selectedLanguages.includes(lang.code) ? "active" : ""
                }`}
                onClick={() => handleLanguageToggle(lang.code)}
                title={`${lang.name} - ${
                  stats.languageStats.find((s) => s.code === lang.code)
                    ?.percentage || 0
                }% complété`}
              >
                <span className="flag">{lang.flag}</span>
                <span className="code">{lang.code}</span>
                {selectedLanguages.includes(lang.code) && (
                  <span className="percentage">
                    {stats.languageStats.find((s) => s.code === lang.code)
                      ?.percentage || 0}
                    %
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
