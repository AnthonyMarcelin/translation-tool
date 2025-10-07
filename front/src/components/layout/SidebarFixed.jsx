import React, { useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useProjectApi } from "../../hooks/useProjectApi";
import {
  GlobeIcon,
  Cross2Icon,
  PlusIcon,
  FileIcon,
  Pencil2Icon,
  TrashIcon
} from "@radix-ui/react-icons";
import "../ProjectActions.css";
import "./Sidebar.css";

const Sidebar = () => {
  const { projects, currentProject, sidebarOpen, actions } = useApp();
  const { fetchProjects, createProject, deleteProject, renameProject } = useProjectApi();
  
  useEffect(() => {
    const loadProjects = async () => {
      try {
        await fetchProjects();
      } catch (err) {
        console.error("Erreur fetch projects:", err);
      }
    };
    loadProjects();
  }, [fetchProjects]);

  const handleProjectSelect = (project) => {
    actions.setCurrentProject(project);
  };

  const handleCreateProject = async () => {
    const name = prompt("Nom du nouveau projet :");
    if (!name || !name.trim()) return;

    try {
      const newProject = await createProject(name.trim());
      actions.setCurrentProject(newProject);
    } catch (error) {
      console.error("Erreur création projet:", error);
      alert(error.message || "Erreur création projet");
    }
  };

  const handleRenameProject = async (project, e) => {
    e.stopPropagation();
    const newName = prompt(`Renommer le projet "${project.name}" :`);
    if (!newName || newName.trim() === project.name) return;

    try {
      const updated = await renameProject(project.id, newName.trim());
      if (currentProject?.id === project.id) {
        actions.setCurrentProject(updated);
      }
    } catch (error) {
      console.error("Erreur renommage projet:", error);
      alert(error.message || "Erreur renommage projet");
    }
  };

  const handleDeleteProject = async (project, e) => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer le projet "${project.name}" ?`)) return;

    try {
      await deleteProject(project.id);
    } catch (error) {
      console.error("Erreur suppression projet:", error);
      alert(error.message || "Erreur suppression projet");
    }
  };

  if (!sidebarOpen) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2><GlobeIcon /> Translation Tool</h2>
        <button className="sidebar-toggle" onClick={actions.toggleSidebar}>
          <Cross2Icon />
        </button>
      </div>

      <div className="sidebar-content">
        <div className="projects-section">
          <div className="section-header">
            <h3>Projets</h3>
            <button
              className="btn-icon"
              onClick={handleCreateProject}
              title="Nouveau projet"
            >
              <PlusIcon />
            </button>
          </div>

          <div className="projects-list">
            {projects.length === 0 ? (
              <div className="empty-state">
                <p>Aucun projet</p>
                <button onClick={handleCreateProject} className="btn-primary">
                  Créer le premier projet
                </button>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className={`project-item ${
                    currentProject?.id === project.id ? "active" : ""
                  }`}
                  onClick={() => handleProjectSelect(project)}
                >
                  <span className="project-name"><FileIcon /> {project.name}</span>
                  <div className="project-actions">
                    <button
                      className="btn-icon rename-btn"
                      onClick={(e) => handleRenameProject(project, e)}
                      title="Renommer"
                    >
                      <Pencil2Icon />
                    </button>
                    <button
                      className="btn-icon delete-btn"
                      onClick={(e) => handleDeleteProject(project, e)}
                      title="Supprimer"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {currentProject && (
          <div className="current-project-info">
            <h4>Projet actuel</h4>
            <div className="project-badge">
              <FileIcon /> {currentProject.name}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
