import { useEffect } from 'react';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';
import useConversationStore from '@/store/conversationStore';

export default function useConversations() {
  const { token } = useAuthStore();
  const { setConversations } = useConversationStore();

  useEffect(() => {
    const fetchConversations = async () => {
      if (!token) return;
      try {
        const response = await api.get('/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setConversations(response.data);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      }
    };

    fetchConversations();
  }, [token, setConversations]);
}
