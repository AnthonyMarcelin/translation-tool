import { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import appReducer from './app.reducer';
import actionCreators from '../utils/actions.helper';

const initialState = {
  projects: [],
  currentProject: JSON.parse(localStorage.getItem("currentProject") || "null") || null,
  translations: [],
  selectedLanguages: JSON.parse(localStorage.getItem("selectedLanguages") || '["fr","en"]'),
  searchTerm: "",
  loading: false,
  filter: "all",
  sort: "key",
  sidebarOpen: window.innerWidth > 768,
  viewMode: localStorage.getItem("viewMode") || "table",
  darkMode: localStorage.getItem("darkMode") === "true" || false,
};


const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const safeDispatch = useCallback((action) => {
    if (!action || !action.type) {
      return;
    }
    return dispatch(action);
  }, []);


  const actions = useMemo(() => {
    return Object.keys(actionCreators).reduce((acc, key) => {
      acc[key] = (...args) => safeDispatch(actionCreators[key](...args));
      return acc;
    }, {});
  }, [safeDispatch]);

  const value = useMemo(
    () => ({ ...state, dispatch: safeDispatch, actions }),
    [state, safeDispatch, actions]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};



export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
