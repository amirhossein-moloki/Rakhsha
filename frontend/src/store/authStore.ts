import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';
import { disconnectSocket } from '@/lib/socket';
import { generateIdentity, encryptPrivateKeys, decryptPrivateKeys } from '@/lib/crypto';
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
        const { user } = get();
        if (user && user.email) {
          localStorage.removeItem(`encryptedPrivateKeys_${user.email}`);
        }
        disconnectSocket();
        set({ token: null, user: null, privateKeys: null, isSecretMode: false });
      },
      register: async (username, email, password) => {
        const identity = await generateIdentity();

        await api.post('/auth/register', {
          username, email, password,
          ...identity.public,
        });

        // Encrypt the private keys with the user's password
        const encryptedPrivateKeys = await encryptPrivateKeys(identity._private, password);

        // Store the encrypted keys in localStorage, scoped to the user's email
        localStorage.setItem(`encryptedPrivateKeys_${email}`, encryptedPrivateKeys);

        // This is NOT secure and should not be used in production.
        set({ privateKeys: identity._private });
      },
      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token } = response.data;
        set({ token, isSecretMode: false });
        await get().fetchUser();

        // After successful login, decrypt and load the private keys
        const encryptedPrivateKeys = localStorage.getItem(`encryptedPrivateKeys_${email}`);
        if (encryptedPrivateKeys) {
          try {
            const decryptedKeys = await decryptPrivateKeys(encryptedPrivateKeys, password);
            set({ privateKeys: decryptedKeys });
          } catch (error) {
            console.error('Failed to decrypt private keys:', error);
            // Handle decryption failure, e.g., by logging out the user or showing an error
          }
        }
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
      // By default, the entire state is persisted. We can selectively choose what to persist.
      // We are excluding 'privateKeys' from being persisted to localStorage for security reasons.
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => !['privateKeys'].includes(key))
        ),
    }
  )
);

export default useAuthStore;
