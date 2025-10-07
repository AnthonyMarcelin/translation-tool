import ACTIONS from '../constants/actions';

const appReducer = (state, action) => {
  if (!action || typeof action !== 'object' || !action.type) {
    console.error('Action invalide :', action);
    return state;
  }

  switch (action.type) {
    case ACTIONS.SET_PROJECTS:
      return {
        ...state,
        projects: Array.isArray(action.payload) ? action.payload : [],
      };

    case ACTIONS.SET_CURRENT_PROJECT:
      const projectData = action.payload
        ? { id: action.payload.id, name: action.payload.name }
        : null;
      localStorage.setItem('currentProject', JSON.stringify(projectData));
      return { ...state, currentProject: projectData };

    case ACTIONS.SET_TRANSLATIONS:
      return {
        ...state,
        translations: Array.isArray(action.payload) ? action.payload : [],
      };

    case ACTIONS.SET_SELECTED_LANGUAGES:
      localStorage.setItem('selectedLanguages', JSON.stringify(action.payload));
      return { ...state, selectedLanguages: action.payload || [] };

    case ACTIONS.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload || '' };

    case ACTIONS.SET_LOADING:
      return { ...state, loading: !!action.payload };

    case ACTIONS.UPDATE_TRANSLATION_VALUE:
      return {
        ...state,
        translations: state.translations.map((trans) =>
          trans.id === action.payload.translationId
            ? {
                ...trans,
                values: {
                  ...trans.values,
                  [action.payload.lang]: action.payload.value ?? '',
                },
              }
            : trans,
        ),
      };

    case ACTIONS.ADD_TRANSLATION:
      return {
        ...state,
        translations: [...(state.translations || []), action.payload],
      };

    case ACTIONS.UPDATE_TRANSLATION:
      return {
        ...state,
        translations: state.translations.map((trans) =>
          trans.id === action.payload.id
            ? { ...trans, ...action.payload }
            : trans,
        ),
      };

    case ACTIONS.REMOVE_TRANSLATION:
      return {
        ...state,
        translations: (state.translations || []).filter(
          (t) => t.id !== action.payload,
        ),
      };

    case ACTIONS.DELETE_PROJECT:
      const shouldClearCurrent = state.currentProject?.id === action.payload;
      if (shouldClearCurrent) {
        localStorage.setItem('currentProject', JSON.stringify(null));
      }
      return {
        ...state,
        projects: state.projects.filter(
          (project) => project.id !== action.payload,
        ),
        currentProject: shouldClearCurrent ? null : state.currentProject,
      };

    case ACTIONS.SET_FILTER:
      return { ...state, filter: action.payload };

    case ACTIONS.SET_SORT:
      return { ...state, sort: action.payload };

    case ACTIONS.SET_VIEW_MODE:
      localStorage.setItem('viewMode', action.payload);
      return { ...state, viewMode: action.payload };

    case ACTIONS.TOGGLE_SIDEBAR:
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case ACTIONS.TOGGLE_DARK_MODE:
      const newDarkMode = !state.darkMode;
      localStorage.setItem('darkMode', newDarkMode.toString());
      return { ...state, darkMode: newDarkMode };

    default:
      return state;
  }
};

export default appReducer;
