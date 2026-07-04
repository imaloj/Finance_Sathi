import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // ✅ REQUIRED for cookies
  headers: { 'Content-Type': 'application/json' },
});

// ✅ Auto refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint = originalRequest.url?.includes('/auth/');
    const isActivityLogVerify = originalRequest.url?.includes('/activity-log/verify');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint &&
      !isActivityLogVerify
    ) {
      originalRequest._retry = true;

      try {
        // 🔥 Cookie-based refresh (no token needed)
        await api.post('/auth/refresh');

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Session expired → redirect
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;