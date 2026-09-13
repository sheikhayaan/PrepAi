import { create } from 'zustand';
import api from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,

  checkAuth: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get('/auth/me');
      set({ user: res.data.user, loading: false });
    } catch (err) {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post('/auth/login', { email, password });
      set({ user: res.data.user, loading: false, error: null });
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed. Please check your credentials.';
      set({ loading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  register: async (name, email, password) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post('/auth/register', { name, email, password });
      set({ user: res.data.user, loading: false, error: null });
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Registration failed. Please try again.';
      set({ loading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  googleAuth: async (credential, profile) => {
    try {
      set({ loading: true, error: null });
      const res = await api.post('/auth/google', { credential, profile });
      set({ user: res.data.user, loading: false, error: null });
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Google authentication failed. Please try again.';
      set({ loading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
      set({ user: null, error: null });
    } catch (err) {
      set({ user: null });
    }
  },

  clearError: () => set({ error: null }),
}));
