import { useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import ProjectService from '../services/project.service';

export const useProjectApi = () => {
  const { actions } = useApp();

  const fetchProjects = useCallback(async () => {
    actions.setLoading(true);
    try {
      const projects = await ProjectService.fetchProjects();
      actions.setProjects(projects);
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    } finally {
      actions.setLoading(false);
    }
  }, [actions]);

  const createProject = useCallback(
    async (name) => {
      try {
        const project = await ProjectService.createProject(name);
        actions.addProject(project);
        actions.setCurrentProject(project);
        return project;
      } catch (error) {
        console.error('Error creating project:', error);
        throw error;
      }
    },
    [actions],
  );

  const renameProject = useCallback(
    async (id, newName) => {
      try {
        const updatedProject = await ProjectService.renameProject(id, newName);
        actions.updateProject(updatedProject);
        return updatedProject;
      } catch (error) {
        console.error('Error renaming project:', error);
        throw error;
      }
    },
    [actions],
  );

  const deleteProject = useCallback(
    async (projectId) => {
      try {
        await ProjectService.deleteProject(projectId);
        actions.deleteProject(projectId);
      } catch (error) {
        console.error('Error deleting project:', error);
        throw error;
      }
    },
    [actions],
  );

  return useMemo(
    () => ({
      fetchProjects,
      createProject,
      renameProject,
      deleteProject,
    }),
    [fetchProjects, createProject, renameProject, deleteProject],
  );
};

export default useProjectApi;
