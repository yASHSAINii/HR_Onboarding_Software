import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the response is HTML (like a 404 page), convert to a JSON error
    if (error.response && error.response.headers['content-type']?.includes('text/html')) {
      return Promise.reject({ ...error, response: { ...error.response, data: { error: 'Server returned HTML' } } });
    }
    if (error.response?.status === 401 && !error.config.url.includes('/auth/me')) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;