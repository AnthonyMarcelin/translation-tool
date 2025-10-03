import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import SidebarFixed from "./components/layout/SidebarFixed";
import Header from "./components/layout/Header";
import AddTranslationFormFixed from "./components/AddTranslationFormFixed";
import TranslationsTable from "./components/TranslationsTableFixed";
import TranslationsCards from "./components/TranslationsCards";
import "./App.css";

const AppContent = () => {
  const { currentProject, sidebarOpen, viewMode, dispatch, actions } = useApp();
  const [isInitialized, setIsInitialized] = useState(false);

  // API functions directement dans le composant pour éviter les boucles
  const fetchProjects = async () => {
    try {
      const response = await fetch("http://localhost:3001/translations");
      const data = await response.json();
      const uniqueProjects = [...new Set(data.map((t) => t.project))].filter(
        Boolean,
      );
      dispatch({ type: actions.SET_PROJECTS, payload: uniqueProjects });
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchTranslations = async (project) => {
    if (!project) return;

    dispatch({ type: actions.SET_LOADING, payload: true });
    try {
      const response = await fetch(
        `http://localhost:3001/translations?project=${project}`,
      );
      const translations = await response.json();

      // Charger les valeurs pour chaque traduction
      const translationsWithValues = await Promise.all(
        translations.map(async (translation) => {
          try {
            const valuesResponse = await fetch(
              `http://localhost:3001/translations/${translation.id}/values`,
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
          } catch (error) {
            console.error(
              `Error loading values for translation ${translation.id}:`,
              error,
            );
            return {
              ...translation,
              values: {},
            };
          }
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
  };

  // Initialisation une seule fois
  useEffect(() => {
    if (!isInitialized) {
      fetchProjects();
      setIsInitialized(true);
    }
  }, [isInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Charger les traductions quand le projet change
  useEffect(() => {
    if (currentProject && isInitialized) {
      fetchTranslations(currentProject);
    }
  }, [currentProject, isInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : ""}`}>
      <SidebarFixed />

      <div className="main-content">
        <Header />

        <div className="content-area">
          {currentProject ? (
            <>
              <AddTranslationFormFixed />
              {viewMode === "table" ? (
                <TranslationsTable />
              ) : (
                <TranslationsCards />
              )}
            </>
          ) : (
            <div className="welcome-screen">
              <div className="welcome-content">
                <div className="welcome-icon">🌍</div>
                <h1>Bienvenue dans Translation Tool</h1>
                <p>
                  Gérez vos traductions i18next avec facilité. Sélectionnez un
                  projet dans la sidebar pour commencer.
                </p>
                <div className="features">
                  <div className="feature">
                    <span className="feature-icon">🚀</span>
                    <span>Traduction automatique</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">📊</span>
                    <span>Suivi de progression</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">💾</span>
                    <span>Export JSON</span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">🔍</span>
                    <span>Recherche avancée</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
