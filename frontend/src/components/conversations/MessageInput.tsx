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

    // Step 1: Encrypt the message for all recipients.
    const messages = await Promise.all(recipients.map(async (recipient) => {
      try {
        const ciphertext = await encryptMessage(recipient, JSON.stringify(plaintextPayload));
        const encryptedTimestamp = await encryptMessage(recipient, timestamp);
        return {
          recipientId: recipient._id,
          ciphertextPayload: JSON.stringify(ciphertext),
          encryptedTimestamp: JSON.stringify(encryptedTimestamp),
        };
      } catch (error) {
        console.error(`Failed to encrypt message for recipient ${recipient._id}:`, error);
        return null; // Handle encryption failure for a single recipient
      }
    }));

    const validMessages = messages.filter(m => m !== null);
    if (validMessages.length === 0) {
      console.error('Failed to encrypt message for any recipient.');
      return;
    }

    // Step 2: Send all encrypted messages in a single API call.
    try {
      await api.post('/messages', {
        conversationId,
        messages: validMessages,
        messageType: 'text',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage('');
    } catch (error) {
      console.error('Failed to send messages in batch:', error);
    }
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
