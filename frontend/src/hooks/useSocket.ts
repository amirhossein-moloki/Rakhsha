import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import useMessageStore from '@/store/messageStore';
import { Message } from '@/types/message';

export default function useSocket() {
  const { addMessage, updateMessage, deleteMessage } = useMessageStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // The responsibility of this hook is to simply update the store with raw message data from the socket.
    // Decryption is handled by the component that needs to display the message (i.e., MessageView.tsx).
    const handleReceiveMessage = (message: Message) => {
      addMessage(message);
    };

    const handleMessageEdited = (message: Message) => {
      // The message is already updated in the backend, just update it in the store.
      // MessageView will re-render and decrypt the new content.
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
  }, [addMessage, updateMessage, deleteMessage]);
}
