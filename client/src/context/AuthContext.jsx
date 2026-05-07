import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// ═══ Prefetch cache for dashboard data ═══
let prefetchedDashboardData = null;

export const getPrefetchedData = () => {
  const data = prefetchedDashboardData;
  prefetchedDashboardData = null; // consume once
  return data;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      let API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      if (API_BASE.endsWith('/')) API_BASE = API_BASE.slice(0, -1);
      if (API_BASE && !API_BASE.startsWith('http')) API_BASE = `https://${API_BASE}`;

      const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
      const userData = response.data;

      setUser(userData);
      localStorage.setItem('userInfo', JSON.stringify(userData));

      // ═══ PREFETCH: Start loading dashboard data immediately ═══
      // Don't await — fire and forget, dashboard will pick it up
      const subjects = userData.subjects || (userData.subject ? [userData.subject] : []);
      if (userData.role === 'professor' && subjects.length > 0) {
        prefetchedDashboardData = axios.get(`${API_BASE}/attendance`, {
          headers: { Authorization: `Bearer ${userData.token}` },
          params: { subject: subjects[0] }
        }).then(res => res.data).catch(() => null);
      } else if (userData.role === 'admin') {
        prefetchedDashboardData = axios.get(`${API_BASE}/attendance`, {
          headers: { Authorization: `Bearer ${userData.token}` }
        }).then(res => res.data).catch(() => null);
      }

      return userData;
    } catch (error) {
      throw error.response?.data?.message || 'Login failed';
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

