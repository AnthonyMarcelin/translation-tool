import { useEffect, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { useApi } from "./hooks/useApiOptimized";
import SidebarFixed from "./components/SidebarFixed";
import Header from "./components/Header";
import AddTranslationFormFixed from "./components/AddTranslationFormFixed";
import TranslationsTable from "./components/TranslationsTableFixed";
import TranslationsCards from "./components/TranslationsCards";
import "./App.css";

const AppContent = () => {
  const { currentProject, sidebarOpen, viewMode } = useApp();
  const [isInitialized, setIsInitialized] = useState(false);
  const { fetchProjects: apiFetchProjects, fetchTranslations: apiFetchTranslations } = useApi();



  // Initialisation une seule fois
  useEffect(() => {
    if (!isInitialized) {
      apiFetchProjects();
      setIsInitialized(true);
    }
  }, [isInitialized, apiFetchProjects]);

  // Charger les traductions quand le projet change
  useEffect(() => {
    if (currentProject && isInitialized) {
      apiFetchTranslations(currentProject);
    }
  }, [currentProject, isInitialized, apiFetchTranslations]);

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
