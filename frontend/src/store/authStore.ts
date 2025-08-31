import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';
import { disconnectSocket } from '@/lib/socket';
import { generateIdentity } from '@/lib/crypto';
import api from '@/api/axios';

interface AuthState {
  token: string | null;
  user: User | null;
  isSecretMode: boolean;
  privateKeys: any | null; // This is not secure and should not be used in production.
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setIsSecretMode: (isSecretMode: boolean) => void;
  setPrivateKeys: (keys: any) => void;
  logout: () => void;
  register: (username: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  secretLogin: (username: string, secondaryPassword: string) => Promise<void>;
  fetchUser: () => Promise<void>;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isSecretMode: false,
      privateKeys: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setIsSecretMode: (isSecretMode) => set({ isSecretMode }),
      setPrivateKeys: (keys) => set({ privateKeys: keys }),
      logout: () => {
        disconnectSocket();
        set({ token: null, user: null, privateKeys: null, isSecretMode: false });
      },
      register: async (username, email, password) => {
        const identity = await generateIdentity();

        await api.post('/auth/register', {
          username, email, password,
          ...identity.public,
        });

        // This is NOT secure and should not be used in production.
        set({ privateKeys: identity._private });
      },
      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token } = response.data;
        set({ token, isSecretMode: false });
        await get().fetchUser();
      },
      secretLogin: async (username, secondaryPassword) => {
        const response = await api.post('/auth/secret-login', { username, secondaryPassword });
        const { token } = response.data;
        set({ token, isSecretMode: true });
        await get().fetchUser();
      },
      fetchUser: async () => {
        const { token } = get();
        if (token) {
          try {
            const response = await api.get('/auth/me', {
              headers: { Authorization: `Bearer ${token}` },
            });
            set({ user: response.data });
          } catch (error) {
            console.error('Failed to fetch user:', error);
            get().logout(); // Logout if token is invalid
          }
        }
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
    }
  )
);

export default useAuthStore;
