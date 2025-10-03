import { useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import ProjectService from '../services/project.service';

export const useProjectApi = () => {
  const { dispatch, actions, projects } = useApp();

  const fetchProjects = useCallback(async () => {
    dispatch({ type: actions.SET_LOADING, payload: true });
    try {
      const uniqueProjects = await ProjectService.fetchProjects();
      dispatch({ type: actions.SET_PROJECTS, payload: uniqueProjects });
      return uniqueProjects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    } finally {
      dispatch({ type: actions.SET_LOADING, payload: false });
    }
  }, [dispatch, actions]);

  const createProject = useCallback(
    async (projectName) => {
      dispatch({
        type: actions.SET_PROJECTS,
        payload: [...projects, projectName],
      });
      dispatch({ type: actions.SET_CURRENT_PROJECT, payload: projectName });
    },
    [dispatch, actions, projects],
  );

  const deleteProject = useCallback(
    async (projectName) => {
      try {
        await ProjectService.deleteProject(projectName);
        dispatch({
          type: actions.SET_PROJECTS,
          payload: projects.filter((p) => p !== projectName),
        });
        dispatch({ type: actions.SET_CURRENT_PROJECT, payload: '' });
        dispatch({ type: actions.SET_TRANSLATIONS, payload: [] });
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    },
    [dispatch, actions, projects],
  );

  const exportTranslations = useCallback(async (project, languages) => {
    try {
      const data = await ProjectService.exportProject(project, languages);

      Object.entries(data).forEach(([lang, translations]) => {
        const blob = new Blob([JSON.stringify(translations, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${lang}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Export error:', error);
    }
  }, []);

  return useMemo(
    () => ({
      fetchProjects,
      createProject,
      deleteProject,
      exportTranslations,
    }),
    [fetchProjects, createProject, deleteProject, exportTranslations],
  );
};
