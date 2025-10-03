import { createContext, useContext, useReducer, useMemo } from 'react';
import appReducer from './app.reducer';
import { actionCreators } from '../utils/actions.helper';

const initialState = {
  projects: [],
  currentProject: localStorage.getItem('currentProject') || '',
  translations: [],
  selectedLanguages: JSON.parse(localStorage.getItem('selectedLanguages') || '["fr","en"]'),
  searchTerm: '',
  loading: false,
  filter: 'all',
  sort: 'key',
  sidebarOpen: window.innerWidth > 768,
  viewMode: localStorage.getItem('viewMode') || 'table',
};

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const actions = useMemo(() => {
    return Object.keys(actionCreators).reduce((acc, key) => {
      acc[key] = (...args) => dispatch(actionCreators[key](...args));
      return acc;
    }, {});
  }, [dispatch]);

  const value = { ...state, dispatch, actions };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};



export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
