import { createContext, useContext, useReducer, useMemo } from "react";

const AppContext = createContext();

// Actions
const ACTIONS = {
  SET_PROJECTS: "SET_PROJECTS",
  SET_CURRENT_PROJECT: "SET_CURRENT_PROJECT",
  SET_TRANSLATIONS: "SET_TRANSLATIONS",
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

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_PROJECTS:
      return { ...state, projects: action.payload };

    case ACTIONS.SET_CURRENT_PROJECT:
      // Persister le projet sélectionné
      localStorage.setItem("currentProject", action.payload);
      return { ...state, currentProject: action.payload };

    case ACTIONS.SET_TRANSLATIONS:
      return { ...state, translations: action.payload };

    case ACTIONS.SET_SELECTED_LANGUAGES:
      // Persister les langues sélectionnées
      localStorage.setItem("selectedLanguages", JSON.stringify(action.payload));
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
      localStorage.setItem("viewMode", action.payload);
      return { ...state, viewMode: action.payload };

    default:
      return state;
  }
};

// État initial
const initialState = {
  projects: [],
  currentProject: localStorage.getItem("currentProject") || "",
  translations: [],
  selectedLanguages: JSON.parse(
    localStorage.getItem("selectedLanguages") || '["fr", "en"]',
  ),
  searchTerm: "",
  loading: false,
  filter: "all", // all, missing, completed
  sort: "key", // key, updated, created
  sidebarOpen: window.innerWidth > 768,
  viewMode: localStorage.getItem("viewMode") || "table", // table, cards
};

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const value = {
    ...state,
    dispatch,
    actions: ACTIONS,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
