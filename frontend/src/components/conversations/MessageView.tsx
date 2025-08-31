import { useState } from 'react';
import useAuthStore from '@/store/authStore';
import useMessageStore from '@/store/messageStore';
import { decryptMessage } from '@/lib/crypto';
import { createStore } from '@/lib/crypto';

interface MessageViewProps {
  conversationId: string;
}

export default function MessageView({ conversationId }: MessageViewProps) {
  const { privateKeys } = useAuthStore();
  const { messages } = useMessageStore();
  const conversationMessages = messages[conversationId] || [];
  const [decryptedMessages, setDecryptedMessages] = useState<any>({});

  const handleDecrypt = async (message: any) => {
    try {
      if (!privateKeys) {
        console.error('Private keys not found.');
        return;
      }
      const store = createStore({ _private: privateKeys, registrationId: 0 }); // Placeholder registrationId
      const plaintext = await decryptMessage(store, message.senderId, message.ciphertextPayload);
      setDecryptedMessages((prev) => ({ ...prev, [message._id]: plaintext }));
    } catch (error) {
      console.error('Failed to decrypt message:', error);
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold">Messages</h2>
      <div className="flex-1 mt-4 overflow-y-auto">
        <ul>
          {messages.map((msg) => (
            <li key={msg._id} className="p-2 my-2 border rounded-md">
              <p className="font-bold">From: {msg.senderId}</p>
              {decryptedMessages[msg._id] ? (
                <p>{decryptedMessages[msg._id]}</p>
              ) : (
                <p className="text-sm text-gray-600 truncate">
                  Encrypted: {JSON.stringify(msg.ciphertextPayload)}
                </p>
              )}
              <button
                onClick={() => handleDecrypt(msg)}
                className="px-2 py-1 mt-2 text-xs text-white bg-green-500 rounded"
              >
                Decrypt
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
