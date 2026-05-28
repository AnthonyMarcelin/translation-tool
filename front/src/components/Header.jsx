import { useApp } from "../context/AppContext";
import { useFilters } from "../hooks/useFilters";
import { LANGUAGES, FILTER_OPTIONS, SORT_OPTIONS, VIEW_MODES } from "../constants";
import "./Header.css";

const Header = () => {
  const { currentProject, projectLanguages, selectedLanguages, searchTerm, filter, sort, viewMode, sidebarOpen, dispatch, actions } = useApp();
  const { stats } = useFilters();

  const handleLanguageToggle = (langCode) => {
    const next = selectedLanguages.includes(langCode)
      ? selectedLanguages.filter(l => l !== langCode)
      : [...selectedLanguages, langCode];
    if (next.length === 0) return;
    dispatch({ type: actions.SET_SELECTED_LANGUAGES, payload: next });
  };

  // Show project languages if available, else fall back to LANGUAGES constant
  const availableLangs = projectLanguages.length > 0
    ? LANGUAGES.filter(l => projectLanguages.some(pl => pl.lang_code === l.code))
    : LANGUAGES;

  if (!currentProject) {
    return (
      <div className="header-empty">
        <div className="container">
          <button className="sidebar-toggle-btn" onClick={() => dispatch({ type: actions.TOGGLE_SIDEBAR })}>
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
        <div className="header-top">
          <div className="header-left">
            <button className="sidebar-toggle-btn" onClick={() => dispatch({ type: actions.TOGGLE_SIDEBAR })}>
              {sidebarOpen ? "✕" : "☰"}
            </button>
            <h1>📁 {currentProject.name}</h1>
          </div>
          <div className="header-right">
            <div className="stats-summary">
              <span className="stat">
                {stats.completed}/{stats.total} complètes ({stats.completionPercentage}%)
              </span>
            </div>
          </div>
        </div>

        <div className="header-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Rechercher des clés ou traductions..."
              value={searchTerm}
              onChange={e => dispatch({ type: actions.SET_SEARCH_TERM, payload: e.target.value })}
              className="search-input"
            />
          </div>
          <div className="filter-controls">
            <select value={filter} onChange={e => dispatch({ type: actions.SET_FILTER, payload: e.target.value })} className="filter-select">
              {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={sort} onChange={e => dispatch({ type: actions.SET_SORT, payload: e.target.value })} className="filter-select">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="view-mode-toggle">
              {VIEW_MODES.map(mode => (
                <button
                  key={mode.value}
                  className={`view-btn ${viewMode === mode.value ? "active" : ""}`}
                  onClick={() => dispatch({ type: actions.SET_VIEW_MODE, payload: mode.value })}
                  title={mode.label}
                >
                  {mode.icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="language-selector">
          <span className="language-label">Langues :</span>
          <div className="language-chips">
            {availableLangs.map(lang => (
              <button
                key={lang.code}
                className={`language-chip ${selectedLanguages.includes(lang.code) ? "active" : ""}`}
                onClick={() => handleLanguageToggle(lang.code)}
                title={`${lang.name} — ${stats.languageStats.find(s => s.code === lang.code)?.percentage || 0}% complété`}
              >
                <span className="flag">{lang.flag}</span>
                <span className="code">{lang.code}</span>
                {selectedLanguages.includes(lang.code) && (
                  <span className="percentage">
                    {stats.languageStats.find(s => s.code === lang.code)?.percentage || 0}%
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
