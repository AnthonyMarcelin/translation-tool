import ACTIONS from '../constants/actions';

const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_PROJECTS:
      return { ...state, projects: action.payload };

    case ACTIONS.SET_CURRENT_PROJECT:
      // Persister le projet sélectionné
      localStorage.setItem('currentProject', action.payload);
      return { ...state, currentProject: action.payload };

    case ACTIONS.SET_TRANSLATIONS:
      return { ...state, translations: action.payload };

    case ACTIONS.SET_SELECTED_LANGUAGES:
      // Persister les langues sélectionnées
      localStorage.setItem('selectedLanguages', JSON.stringify(action.payload));
      return { ...state, selectedLanguages: action.payload };

    case ACTIONS.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload };

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.UPDATE_TRANSLATION_VALUE:
      return {
        ...state,
        translations: state.translations.map((trans) =>
          trans.id === action.payload.translationId
            ? {
                ...trans,
                values: {
                  ...trans.values,
                  [action.payload.lang]: action.payload.value,
                },
              }
            : trans,
        ),
      };

    case ACTIONS.ADD_TRANSLATION:
      return {
        ...state,
        translations: [...state.translations, action.payload],
      };

    case ACTIONS.REMOVE_TRANSLATION:
      return {
        ...state,
        translations: state.translations.filter((t) => t.id !== action.payload),
      };

    case ACTIONS.SET_FILTER:
      return { ...state, filter: action.payload };

    case ACTIONS.SET_SORT:
      return { ...state, sort: action.payload };

    case ACTIONS.TOGGLE_SIDEBAR:
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case ACTIONS.SET_VIEW_MODE:
      localStorage.setItem('viewMode', action.payload);
      return { ...state, viewMode: action.payload };

    default:
      return state;
  }
};

export default appReducer;
