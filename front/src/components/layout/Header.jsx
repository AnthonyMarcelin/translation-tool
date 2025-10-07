import { useApp } from "../../context/AppContext";
import { useFilters } from "../../hooks/useFilters";
import {
  LANGUAGES,
  FILTER_OPTIONS,
  SORT_OPTIONS,
  VIEW_MODES,
} from "../../constants";
import { TableIcon, LayersIcon, MagnifyingGlassIcon, HamburgerMenuIcon, Cross2Icon, FileIcon } from "@radix-ui/react-icons";
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
    actions,
  } = useApp();

  const { stats } = useFilters();

  const handleLanguageToggle = (langCode) => {
    const newLanguages = selectedLanguages.includes(langCode)
      ? selectedLanguages.filter((l) => l !== langCode)
      : [...selectedLanguages, langCode];

    if (newLanguages.length === 0) return;

    actions.setSelectedLanguages(newLanguages);
  };

  if (!currentProject) {
    return (
      <div className="header-empty">
        <div className="container">
          <button
            className="sidebar-toggle-btn"
            onClick={actions.toggleSidebar}
          >
            {sidebarOpen ? <Cross2Icon /> : <HamburgerMenuIcon />}
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
            <button
              className="sidebar-toggle-btn"
              onClick={actions.toggleSidebar}
            >
              {sidebarOpen ? <Cross2Icon /> : <HamburgerMenuIcon />}
            </button>
            <h1><FileIcon /> {currentProject.name}</h1>
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


        <div className="header-controls">

          <div className="search-box">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher des clés ou traductions..."
              value={searchTerm}
              onChange={(e) => actions.setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>


          <div className="filter-controls">
            <select
              value={filter}
              onChange={(e) => actions.setFilter(e.target.value)}
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
              onChange={(e) => actions.setSort(e.target.value)}
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
                  onClick={() => actions.setViewMode(mode.value)}
                  title={mode.label}
                >
                  {mode.value === "table" ? <TableIcon /> : <LayersIcon />}
                </button>
              ))}
            </div>
          </div>
        </div>

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
