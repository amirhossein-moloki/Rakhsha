import { create } from 'zustand';
import { Conversation } from '@/types/conversation';

interface ConversationState {
  conversations: Conversation[];
  loading: boolean;
  setConversations: (conversations: Conversation[]) => void;
  setLoading: (loading: boolean) => void;
}

const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  loading: true, // Start with loading: true by default
  setConversations: (conversations) => set({ conversations }),
  setLoading: (loading) => set({ loading }),
}));

export default useConversationStore;
