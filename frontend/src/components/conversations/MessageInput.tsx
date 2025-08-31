import { useState } from 'react';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';
import { encryptMessage } from '@/lib/crypto';
import { createStore } from '@/lib/crypto';

interface MessageInputProps {
  conversationId: string;
}

export default function MessageInput({ conversationId }: MessageInputProps) {
  const { token, privateKeys } = useAuthStore();
  const [message, setMessage] = useState('');

  const handleSendMessage = async () => {
    if (!token || !privateKeys || !message.trim()) return;

    try {
      // This is a simplified example. In a real app, you would need to manage sessions
      // for each participant in the conversation.
      const store = createStore({ _private: privateKeys, registrationId: 0 }); // Placeholder

      // You would need the recipient's identity key and registration ID to create the address.
      // This is a placeholder and will not work without the recipient's actual data.
      const recipientId = 'RECIPIENT_ID_PLACEHOLDER';
      const ciphertext = await encryptMessage(store, recipientId, message);

      await api.post('/messages', {
        conversationId,
        ciphertextPayload: ciphertext,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="p-4 bg-white border-t">
      <div className="flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-l-md"
          placeholder="Type a message..."
        />
        <button
          onClick={handleSendMessage}
          className="px-4 py-2 font-bold text-white bg-blue-500 rounded-r-md"
        >
          Send
        </button>
      </div>
    </div>
  );
}
