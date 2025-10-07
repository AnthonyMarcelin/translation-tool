import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import SidebarFixed from "./components/layout/SidebarFixed";
import Header from "./components/layout/Header";
import AddTranslationFormFixed from "./components/translations/forms/AddTranslationFormFixed";
import TranslationsTable from "./components/translations/TranslationsTableFixed";
import TranslationsCards from "./components/translations/TranslationsCards";
import DarkModeToggle from "./components/ui/DarkModeToggle";
import { useTranslationApi } from "./hooks/useTranslationApi";
import { useProjectApi } from "./hooks/useProjectApi";
import "./App.css";

const AppContent = () => {
  const { currentProject, sidebarOpen, viewMode, darkMode, actions } = useApp();
  const translationApi = useTranslationApi();
  const projectApi = useProjectApi();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    if (!isInitialized) {
      projectApi.fetchProjects()
        .then((projects) => {
          if (currentProject?.id) {
            const projectExists = projects.some(p => p.id === currentProject.id);
            if (!projectExists) {
              console.warn('Current project no longer exists in database, clearing...');
              actions.setCurrentProject(null);
            }
          }
        })
        .catch(console.error);
      setIsInitialized(true);
    }
  }, [isInitialized, projectApi, currentProject, actions]);

  useEffect(() => {
    if (!currentProject?.id) return;

    translationApi.fetchTranslations(currentProject.id)
      .catch(console.error);
  }, [currentProject, translationApi]);

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : ""}`}>
      <SidebarFixed />
      <DarkModeToggle />

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
