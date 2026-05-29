import { useEffect, useState, useCallback } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AddTranslationForm from "./components/AddTranslationForm";
import TranslationsTable from "./components/TranslationsTable";
import TranslationsCards from "./components/TranslationsCards";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import ProjectSettingsPage from "./pages/ProjectSettingsPage";
import { apiJson } from "./lib/api";
import "./App.css";

const AppContent = () => {
  const { currentProject, sidebarOpen, viewMode, dispatch, actions } = useApp();
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    try {
      const orgs = await apiJson("/auth/me");
      if (!orgs.organizations || orgs.organizations.length === 0) return;
      const firstOrg = orgs.organizations[0];
      const projects = await apiJson(`/orgs/${firstOrg.slug}/projects`);
      dispatch({ type: actions.SET_ORGS, payload: orgs.organizations });
      dispatch({ type: actions.SET_PROJECTS, payload: projects });
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }, [user, dispatch, actions]);

  const fetchTranslations = useCallback(async (project) => {
    if (!project?.id) return;
    dispatch({ type: actions.SET_LOADING, payload: true });
    try {
      const data = await apiJson(`/projects/${project.id}/translations?limit=200`);
      const langs = await apiJson(`/projects/${project.id}/languages`);
      dispatch({ type: actions.SET_TRANSLATIONS, payload: data.data || [] });
      dispatch({ type: actions.SET_PROJECT_LANGUAGES, payload: langs });
    } catch (error) {
      console.error("Error fetching translations:", error);
    } finally {
      dispatch({ type: actions.SET_LOADING, payload: false });
    }
  }, [dispatch, actions]);

  useEffect(() => {
    if (user && !isInitialized) {
      fetchProjects();
      setIsInitialized(true);
    }
  }, [user, isInitialized, fetchProjects]);

  useEffect(() => {
    if (currentProject && isInitialized) {
      fetchTranslations(currentProject);
    }
  }, [currentProject?.id, isInitialized]);

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : ""}`}>
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="content-area">
          {currentProject ? (
            <>
              <AddTranslationForm />
              {viewMode === "table" ? <TranslationsTable /> : <TranslationsCards />}
            </>
          ) : (
            <div className="welcome-screen">
              <div className="welcome-content">
                <div className="welcome-icon">🌍</div>
                <h1>Bienvenue dans Translation Tool</h1>
                <p>Gérez vos traductions avec facilité. Sélectionnez un projet dans la sidebar pour commencer.</p>
                <div className="features">
                  <div className="feature"><span className="feature-icon">🚀</span><span>Traduction automatique</span></div>
                  <div className="feature"><span className="feature-icon">📊</span><span>Suivi de progression</span></div>
                  <div className="feature"><span className="feature-icon">💾</span><span>Export JSON/YAML/ZIP</span></div>
                  <div className="feature"><span className="feature-icon">🔑</span><span>Clés API</span></div>
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
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />
      <Route path="/projects/:projectId/settings" element={
        <ProtectedRoute>
          <ProjectSettingsPage />
        </ProtectedRoute>
      } />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
