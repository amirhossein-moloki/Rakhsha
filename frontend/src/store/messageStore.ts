import { create } from 'zustand';
import { Message } from '@/types/message'; // I'll need to create this type

interface MessageState {
  messages: { [conversationId: string]: Message[] };
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  deleteMessage: (messageId: string, conversationId: string) => void;
}

const useMessageStore = create<MessageState>((set) => ({
  messages: {},
  addMessage: (message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [message.conversationId]: [...(state.messages[message.conversationId] || []), message],
      },
    })),
  updateMessage: (message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [message.conversationId]: (state.messages[message.conversationId] || []).map((m) =>
          m._id === message._id ? message : m
        ),
      },
    })),
  deleteMessage: (messageId, conversationId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).filter(
          (m) => m._id !== messageId
        ),
      },
    })),
}));

export default useMessageStore;
