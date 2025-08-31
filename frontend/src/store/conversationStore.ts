import { create } from 'zustand';
import { Conversation } from '@/types/conversation'; // I'll need to create this type

interface ConversationState {
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
}

const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  setConversations: (conversations) => set({ conversations }),
}));

export default useConversationStore;
