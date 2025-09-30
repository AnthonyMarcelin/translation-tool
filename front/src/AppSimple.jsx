import { useEffect, memo } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import "./App.css";

// Version simplifiée pour éviter les crashes
const SimpleApp = memo(() => {
  const {
    projects = [],
    currentProject = "",
    selectedLanguages = ["fr", "en"],
    translations = [],
    loading = false,
    dispatch,
    actions,
  } = useApp();

  // API simplifiée
  const fetchProjects = async () => {
    if (loading) return;

    dispatch({ type: actions.SET_LOADING, payload: true });
    try {
      const response = await fetch("http://localhost:3001/translations");
      const data = await response.json();
      const uniqueProjects = [...new Set(data.map((t) => t.project))].filter(
        Boolean,
      );
      dispatch({ type: actions.SET_PROJECTS, payload: uniqueProjects });
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      dispatch({ type: actions.SET_LOADING, payload: false });
    }
  };

  const fetchTranslations = async (project) => {
    if (!project || loading) return;

    dispatch({ type: actions.SET_LOADING, payload: true });
    try {
      const response = await fetch(
        `http://localhost:3001/translations?project=${project}`,
      );
      const translations = await response.json();

      // Version simplifiée sans toutes les valeurs
      dispatch({ type: actions.SET_TRANSLATIONS, payload: translations });
    } catch (error) {
      console.error("Error fetching translations:", error);
    } finally {
      dispatch({ type: actions.SET_LOADING, payload: false });
    }
  };

  // Charger les projets une seule fois
  useEffect(() => {
    fetchProjects();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Charger les traductions quand le projet change
  useEffect(() => {
    if (currentProject) {
      fetchTranslations(currentProject);
    }
  }, [currentProject]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProjectSelect = (project) => {
    dispatch({ type: actions.SET_CURRENT_PROJECT, payload: project });
  };

  const handleLanguageToggle = (langCode) => {
    const newLanguages = selectedLanguages.includes(langCode)
      ? selectedLanguages.filter((l) => l !== langCode)
      : [...selectedLanguages, langCode];

    if (newLanguages.length === 0) return;

    dispatch({ type: actions.SET_SELECTED_LANGUAGES, payload: newLanguages });
  };

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui" }}>
      <h1>🌍 Translation Tool - Version Simplifiée</h1>

      {loading && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div>Chargement...</div>
        </div>
      )}

      {/* Sélection du projet */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Projets disponibles :</h3>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {projects.map((project) => (
            <button
              key={project}
              onClick={() => handleProjectSelect(project)}
              style={{
                padding: "10px 15px",
                backgroundColor:
                  currentProject === project ? "#007bff" : "#f8f9fa",
                color: currentProject === project ? "white" : "black",
                border: "1px solid #ddd",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              📁 {project}
            </button>
          ))}
        </div>
      </div>

      {/* Sélection des langues */}
      {currentProject && (
        <div style={{ marginBottom: "20px" }}>
          <h3>Langues sélectionnées :</h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {[
              { code: "fr", name: "Français", flag: "🇫🇷" },
              { code: "en", name: "English", flag: "🇬🇧" },
              { code: "es", name: "Español", flag: "🇪🇸" },
              { code: "de", name: "Deutsch", flag: "🇩🇪" },
              { code: "it", name: "Italiano", flag: "🇮🇹" },
              { code: "nl", name: "Nederlands", flag: "🇳🇱" },
              { code: "pt", name: "Português", flag: "🇵🇹" },
              { code: "ja", name: "日本語", flag: "🇯🇵" },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageToggle(lang.code)}
                style={{
                  padding: "8px 12px",
                  backgroundColor: selectedLanguages.includes(lang.code)
                    ? "#28a745"
                    : "#f8f9fa",
                  color: selectedLanguages.includes(lang.code)
                    ? "white"
                    : "black",
                  border: "1px solid #ddd",
                  borderRadius: "20px",
                  cursor: "pointer",
                }}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liste des traductions */}
      {currentProject && (
        <div>
          <h3>Traductions ({translations.length})</h3>
          <div style={{ display: "grid", gap: "10px" }}>
            {translations.slice(0, 20).map((translation) => (
              <div
                key={translation.id}
                style={{
                  padding: "15px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  backgroundColor: "#f9f9f9",
                }}
              >
                <strong>🔑 {translation.key}</strong>
                <div
                  style={{ fontSize: "0.9em", color: "#666", marginTop: "5px" }}
                >
                  📁 Projet: {translation.project}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!currentProject && !loading && (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          <div style={{ fontSize: "3em", marginBottom: "20px" }}>📝</div>
          <p>Sélectionnez un projet pour voir les traductions</p>
        </div>
      )}
    </div>
  );
});

SimpleApp.displayName = "SimpleApp";

function App() {
  return (
    <AppProvider>
      <SimpleApp />
    </AppProvider>
  );
}

export default App;
