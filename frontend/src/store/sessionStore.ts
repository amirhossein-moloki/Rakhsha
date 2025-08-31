import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  sessions: Record<string, any>; // Key is recipient's identity key, value is the session record
  getSession: (recipientIdentityKey: string) => any | undefined;
  setSession: (recipientIdentityKey: string, session: any) => void;
}

const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: {},
      getSession: (recipientIdentityKey) => {
        return get().sessions[recipientIdentityKey];
      },
      setSession: (recipientIdentityKey, session) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [recipientIdentityKey]: session,
          },
        }));
      },
    }),
    {
      name: 'session-storage',
    }
  )
);

export default useSessionStore;
