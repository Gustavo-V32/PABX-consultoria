import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string;
  maxChats?: number;
  organizationId: string;
  organization?: { name: string; slug: string; logo?: string };
  extension?: { number: string; name: string };
  settings?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  updateStatus: (status: string) => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { accessToken, refreshToken, user } = data.data || data;

          set({ token: accessToken, refreshToken, user, isLoading: false });
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        const { refreshToken } = get();
        if (refreshToken) {
          api.post('/auth/logout', { refreshToken }).catch(() => {});
        }
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, refreshToken: null });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return;

        const { data } = await api.post('/auth/refresh', { refreshToken });
        const { accessToken } = data.data || data;
        set({ token: accessToken });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },

      updateStatus: async (status) => {
        await api.patch('/users/me/status', { status });
        set(state => ({ user: state.user ? { ...state.user, status } : null }));
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'omnisuite-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    },
  ),
);
