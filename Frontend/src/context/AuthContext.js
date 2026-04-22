import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';

const AuthContext = createContext();

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getCookie('token');
    console.log('AuthProvider: token cookie =', token ? 'present' : 'missing');
    if (!token) {
      console.log('No token, setting loading=false');
      setLoading(false);
      return;
    }
    try {
      const decoded = jwtDecode(token);
      console.log('Decoded token:', decoded);
      const currentTime = Date.now() / 1000;
      const isExpired = decoded.exp < currentTime;
      console.log(`Token expires at ${new Date(decoded.exp * 1000)}. Expired? ${isExpired}`);
      if (!isExpired) {
        const storedUser = localStorage.getItem('user');
        console.log('Stored user from localStorage:', storedUser);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          console.log('User restored from localStorage');
        } else {
          console.warn('Token valid but no user in localStorage');
          setUser(null);
        }
      } else {
        console.log('Token expired, removing user from localStorage');
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch (err) {
      console.error('Token decode error:', err);
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, credential, role) => {
    const response = await api.post('/auth/login', { email, credential, role });
    if (response.data.user) {
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      console.log('User saved to localStorage after login');
    }
    return response.data;
  };

  const setPassword = async (password, confirmPassword) => {
    const response = await api.post('/auth/set-password', { password, confirmPassword });
    if (response.data.user) {
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, setPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);