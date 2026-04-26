import axios from 'axios';

export const api = axios.create({
  baseURL: typeof window !== 'undefined'
    ? `${window.location.origin}/api`
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Dynamically import to avoid circular deps
        const { useAuthStore } = await import('@/store/auth-store');
        const store = useAuthStore.getState();

        if (store.refreshToken) {
          await store.refreshAccessToken();
          originalRequest.headers['Authorization'] = `Bearer ${useAuthStore.getState().token}`;
          return api(originalRequest);
        }
      } catch {
        const { useAuthStore } = await import('@/store/auth-store');
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);
