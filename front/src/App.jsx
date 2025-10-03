import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import SidebarFixed from "./components/layout/SidebarFixed";
import Header from "./components/layout/Header";
import AddTranslationFormFixed from "./components/translations/forms/AddTranslationFormFixed";
import TranslationsTable from "./components/translations/TranslationsTableFixed";
import TranslationsCards from "./components/translations/TranslationsCards";
import { useTranslationApi } from "./hooks/useTranslationApi";
import { useProjectApi } from "./hooks/useProjectApi";
import "./App.css";

const AppContent = () => {
  const { currentProject, sidebarOpen, viewMode, actions } = useApp();
  const translationApi = useTranslationApi();
  const projectApi = useProjectApi();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialisation : charger projets
  useEffect(() => {
    if (!isInitialized) {
      projectApi.fetchProjects()
        .then((projects) => actions.setProjects(projects))
        .catch(console.error);
      setIsInitialized(true);
    }
  }, [isInitialized, projectApi, actions]);

  // Charger traductions à chaque changement de projet
  useEffect(() => {
    if (!currentProject) return;

    actions.setLoading(true);
    translationApi.fetchTranslations(currentProject)
      .then((translations) => actions.setTranslations(translations))
      .catch(console.error)
      .finally(() => actions.setLoading(false));
  }, [currentProject, translationApi, actions]);

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
