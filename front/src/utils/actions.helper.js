import ACTIONS from '../constants/actions';

const actionCreators = {
  setProjects: (projects) => ({
    type: ACTIONS.SET_PROJECTS,
    payload: projects,
  }),
  setCurrentProject: (project) => ({
    type: ACTIONS.SET_CURRENT_PROJECT,
    payload: project,
  }),
  setTranslations: (translations) => ({
    type: ACTIONS.SET_TRANSLATIONS,
    payload: translations,
  }),
  setSelectedLanguages: (languages) => ({
    type: ACTIONS.SET_SELECTED_LANGUAGES,
    payload: languages,
  }),
  setSearchTerm: (term) => ({ type: ACTIONS.SET_SEARCH_TERM, payload: term }),
  setLoading: (isLoading) => ({
    type: ACTIONS.SET_LOADING,
    payload: isLoading,
  }),
  updateTranslationValue: (translationId, lang, value) => ({
    type: ACTIONS.UPDATE_TRANSLATION_VALUE,
    payload: { translationId, lang, value },
  }),
  addTranslation: (translation) => ({
    type: ACTIONS.ADD_TRANSLATION,
    payload: translation,
  }),
  updateTranslation: (translation) => ({
    type: ACTIONS.UPDATE_TRANSLATION,
    payload: translation,
  }),
  removeTranslation: (translationId) => ({
    type: ACTIONS.REMOVE_TRANSLATION,
    payload: translationId,
  }),
  setFilter: (filter) => ({ type: ACTIONS.SET_FILTER, payload: filter }),
  setSort: (sort) => ({ type: ACTIONS.SET_SORT, payload: sort }),
  toggleSidebar: () => ({ type: ACTIONS.TOGGLE_SIDEBAR }),
  setViewMode: (mode) => ({ type: ACTIONS.SET_VIEW_MODE, payload: mode }),
  addProject: (project) => ({
    type: ACTIONS.ADD_PROJECT,
    payload: project,
  }),
  updateProject: (project) => ({
    type: ACTIONS.UPDATE_PROJECT,
    payload: project,
  }),
  deleteProject: (projectId) => ({
    type: ACTIONS.DELETE_PROJECT,
    payload: projectId,
  }),
  toggleDarkMode: () => ({
    type: ACTIONS.TOGGLE_DARK_MODE,
  }),
};

export default actionCreators;
