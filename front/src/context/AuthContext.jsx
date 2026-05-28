import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiJson, clearTokens, API_BASE } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('current_user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    if (!user && localStorage.getItem('access_token')) {
      apiJson('/auth/me').then(data => {
        setUser(data);
        localStorage.setItem('current_user', JSON.stringify(data));
      }).catch(() => {
        clearTokens();
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('current_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await apiJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('current_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiJson('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: localStorage.getItem('refresh_token') }),
      });
    } catch {}
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
