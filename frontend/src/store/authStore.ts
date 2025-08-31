import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';
import { disconnectSocket } from '@/lib/socket';

interface AuthState {
  token: string | null;
  user: User | null;
  privateKeys: any | null; // This is not secure and should not be used in production.
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setPrivateKeys: (keys: any) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      privateKeys: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setPrivateKeys: (keys) => set({ privateKeys: keys }),
      logout: () => {
        disconnectSocket();
        set({ token: null, user: null, privateKeys: null });
      },
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
    }
  )
);

export default useAuthStore;
