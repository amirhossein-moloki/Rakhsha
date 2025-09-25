import { useState } from 'react';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';
import useConversationStore from '@/store/conversationStore';
import { getSignalStore, encryptMessage } from '@/lib/crypto';
import { useEffect } from 'react';

interface MessageInputProps {
  conversationId: string;
}

export default function MessageInput({ conversationId }: MessageInputProps) {
  const { token, user, privateKeys } = useAuthStore();
  const { conversations } = useConversationStore();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (privateKeys) {
      getSignalStore(privateKeys);
    }
  }, [privateKeys]);

  const handleSendMessage = async () => {
    if (!token || !user || !message.trim()) return;

    const conversation = conversations.find(c => c._id === conversationId);
    if (!conversation) {
      console.error('Current conversation not found');
      return;
    }

    const timestamp = new Date().toISOString();
    const plaintextPayload = {
      senderId: user._id,
      content: message,
      timestamp: timestamp,
    };

    const recipients = conversation.participants.filter(p => p._id !== user._id);

    for (const recipient of recipients) {
      try {
        const ciphertext = await encryptMessage(recipient, JSON.stringify(plaintextPayload));
        // The timestamp is encrypted separately for the server to use for TTL etc.
        // In a real system, this might use a different key or mechanism.
        const encryptedTimestamp = await encryptMessage(recipient, timestamp);


        await api.post('/messages', {
          conversationId,
          recipientId: recipient._id,
          ciphertextPayload: JSON.stringify(ciphertext), // The libsignal ciphertext is an object
          messageType: 'text',
          encryptedTimestamp: JSON.stringify(encryptedTimestamp),
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error(`Failed to send message to recipient ${recipient._id}:`, error);
      }
    }
    setMessage('');
  };

  return (
    <div className="p-4 bg-black border-t border-royal-red">
      <div className="flex items-center">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-l-md bg-gray-800 border-gray-700 text-white"
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button
          onClick={handleSendMessage}
          className="px-4 py-2 font-bold text-white bg-royal-red rounded-r-md"
        >
          Send
        </button>
      </div>
    </div>
  );
}
