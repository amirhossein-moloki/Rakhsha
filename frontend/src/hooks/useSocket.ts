import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import useMessageStore from '@/store/messageStore';
import { decryptMessage } from '@/lib/crypto';
import useAuthStore from '@/store/authStore';
import { createStore } from '@/lib/crypto';
import { Message } from '@/types/message';

export default function useSocket() {
  const { addMessage, updateMessage, deleteMessage } = useMessageStore();
  const { privateKeys } = useAuthStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceiveMessage = async (message: Message) => {
      try {
        if (!privateKeys) return;
        const store = createStore({ _private: privateKeys, registrationId: 0 }); // Placeholder
        const plaintext = await decryptMessage(store, message.senderId, message.ciphertextPayload);
        addMessage({ ...message, content: plaintext });
      } catch (error) {
        console.error('Failed to decrypt and add message:', error);
      }
    };

    const handleMessageEdited = (message: Message) => {
      // Decryption for edited messages would be similar to new messages
      updateMessage(message);
    };

    const handleMessageDeleted = ({ messageId, conversationId }: { messageId: string, conversationId: string }) => {
      deleteMessage(messageId, conversationId);
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [addMessage, updateMessage, deleteMessage, privateKeys]);
}
