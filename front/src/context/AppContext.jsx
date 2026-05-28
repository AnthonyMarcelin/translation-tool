import { createContext, useContext, useReducer } from "react";

const AppContext = createContext();

const ACTIONS = {
  SET_ORGS: "SET_ORGS",
  SET_CURRENT_ORG: "SET_CURRENT_ORG",
  SET_PROJECTS: "SET_PROJECTS",
  SET_CURRENT_PROJECT: "SET_CURRENT_PROJECT",
  SET_TRANSLATIONS: "SET_TRANSLATIONS",
  SET_PROJECT_LANGUAGES: "SET_PROJECT_LANGUAGES",
  SET_SELECTED_LANGUAGES: "SET_SELECTED_LANGUAGES",
  SET_SEARCH_TERM: "SET_SEARCH_TERM",
  SET_LOADING: "SET_LOADING",
  UPDATE_TRANSLATION_VALUE: "UPDATE_TRANSLATION_VALUE",
  ADD_TRANSLATION: "ADD_TRANSLATION",
  REMOVE_TRANSLATION: "REMOVE_TRANSLATION",
  SET_FILTER: "SET_FILTER",
  SET_SORT: "SET_SORT",
  TOGGLE_SIDEBAR: "TOGGLE_SIDEBAR",
  SET_VIEW_MODE: "SET_VIEW_MODE",
};

const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_ORGS:
      return { ...state, orgs: action.payload };

    case ACTIONS.SET_CURRENT_ORG:
      localStorage.setItem("currentOrgSlug", action.payload?.slug || "");
      return { ...state, currentOrg: action.payload };

    case ACTIONS.SET_PROJECTS:
      return { ...state, projects: action.payload };

    case ACTIONS.SET_CURRENT_PROJECT:
      localStorage.setItem("currentProjectId", action.payload?.id || "");
      return { ...state, currentProject: action.payload, translations: [] };

    case ACTIONS.SET_TRANSLATIONS:
      return { ...state, translations: action.payload };

    case ACTIONS.SET_PROJECT_LANGUAGES:
      const defaultLangs = action.payload.map(l => l.lang_code);
      const selected = state.selectedLanguages.filter(l => defaultLangs.includes(l));
      return {
        ...state,
        projectLanguages: action.payload,
        selectedLanguages: selected.length > 0 ? selected : defaultLangs.slice(0, 4),
      };

    case ACTIONS.SET_SELECTED_LANGUAGES:
      localStorage.setItem("selectedLanguages", JSON.stringify(action.payload));
      return { ...state, selectedLanguages: action.payload };

    case ACTIONS.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload };

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.UPDATE_TRANSLATION_VALUE:
      return {
        ...state,
        translations: state.translations.map((t) =>
          t.id === action.payload.translationId
            ? { ...t, values: { ...t.values, [action.payload.lang]: action.payload.value } }
            : t
        ),
      };

    case ACTIONS.ADD_TRANSLATION:
      return { ...state, translations: [action.payload, ...state.translations] };

    case ACTIONS.REMOVE_TRANSLATION:
      return { ...state, translations: state.translations.filter((t) => t.id !== action.payload) };

    case ACTIONS.SET_FILTER:
      return { ...state, filter: action.payload };

    case ACTIONS.SET_SORT:
      return { ...state, sort: action.payload };

    case ACTIONS.TOGGLE_SIDEBAR:
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case ACTIONS.SET_VIEW_MODE:
      localStorage.setItem("viewMode", action.payload);
      return { ...state, viewMode: action.payload };

    default:
      return state;
  }
};

const savedProjectId = localStorage.getItem("currentProjectId");

const initialState = {
  orgs: [],
  currentOrg: null,
  projects: [],
  currentProject: null,
  translations: [],
  projectLanguages: [],
  selectedLanguages: JSON.parse(localStorage.getItem("selectedLanguages") || '["fr","en"]'),
  searchTerm: "",
  loading: false,
  filter: "all",
  sort: "key",
  sidebarOpen: window.innerWidth > 768,
  viewMode: localStorage.getItem("viewMode") || "table",
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const value = { ...state, dispatch, actions: ACTIONS };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
