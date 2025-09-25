import { useState, useEffect } from 'react';
import useAuthStore from '@/store/authStore';
import useMessageStore from '@/store/messageStore';
import useUserStore from '@/store/userStore';
import useConversationStore from '@/store/conversationStore';
import { decryptMessage, encryptMessage } from '@/lib/crypto';
import api from '@/api/axios';

interface MessageViewProps {
  conversationId: string;
}

interface DecryptedMessage {
  senderId: string;
  content: string;
  timestamp: string;
}

export default function MessageView({ conversationId }: MessageViewProps) {
  const { token, user } = useAuthStore();
  const { users } = useUserStore();
  const { messages, deleteMessage: deleteFromStore } = useMessageStore();
  const conversationMessages = messages[conversationId] || [];
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, DecryptedMessage>>({});
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    const decryptAllMessages = async () => {
      for (const msg of conversationMessages) {
        // The msg object from websocket now contains senderIdentityKey
        if (!decryptedMessages[msg._id] && msg.senderIdentityKey) {
          try {
            // The ciphertext from the backend is a stringified object
            const ciphertext = JSON.parse(msg.ciphertextPayload);
            const plaintext = await decryptMessage(msg.senderIdentityKey, msg.registrationId, ciphertext);
            const decryptedData: DecryptedMessage = JSON.parse(plaintext);
            setDecryptedMessages((prev) => ({ ...prev, [msg._id]: decryptedData }));
          } catch (error) {
            console.error(`Failed to decrypt message ${msg._id}:`, error);
            setDecryptedMessages((prev) => ({
              ...prev,
              [msg._id]: { senderId: '?', content: '[Decryption Failed]', timestamp: '' },
            }));
          }
        }
      }
    };
    decryptAllMessages();
  }, [conversationMessages, decryptedMessages]);

  const getUsername = (userId: string) => users.find(u => u._id === userId)?.username || 'Unknown User';

  const handleEdit = (message: any) => {
    setEditingMessage(message);
    setEditText(decryptedMessages[message._id]?.content || '');
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !token || !user) return;
    try {
      // Re-encrypt for all participants
      const conversation = useConversationStore.getState().conversations.find(c => c._id === conversationId);
      if (!conversation) {
        console.error('Conversation not found');
        return;
      }
      const recipients = conversation.participants.filter(p => p._id !== user._id);

      for(const recipient of recipients) {
        const ciphertext = await encryptMessage(recipient, editText);
        await api.put(`/conversations/messages/${editingMessage._id}`, {
            recipientId: recipient._id,
            ciphertextPayload: JSON.stringify(ciphertext)
        }, {
            headers: { Authorization: `Bearer ${token}` },
        });
      }
      setEditingMessage(null);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/conversations/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      deleteFromStore(id, conversationId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const renderMessageContent = (msg: any, decrypted: DecryptedMessage) => {
    if (editingMessage?._id === msg._id) {
      return (
        <div>
          <input value={editText} onChange={e => setEditText(e.target.value)} className="w-full px-2 py-1 border rounded bg-gray-700 border-gray-600" />
          <button onClick={handleSaveEdit} className="px-2 py-1 mt-1 text-xs text-white bg-royal-red rounded hover:bg-opacity-80">Save</button>
        </div>
      );
    }
    return <p>{decrypted?.content}</p>;
  }

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold border-b border-royal-red pb-2">Messages</h2>
      <div className="flex-1 mt-4 overflow-y-auto">
        <ul>
          {conversationMessages.map((msg) => {
            const decrypted = decryptedMessages[msg._id];
            const isMyMessage = decrypted?.senderId === user?._id;

            return (
              <li key={msg._id} className={`p-2 my-2 border border-royal-red rounded-md ${isMyMessage ? 'bg-gray-800 ml-auto' : 'bg-gray-900'}`} style={{maxWidth: '80%'}}>
                <div className="flex justify-between">
                  <p className="font-bold">{isMyMessage ? 'You' : getUsername(decrypted?.senderId)}</p>
                  <div>
                    {isMyMessage && <button onClick={() => handleEdit(msg)} className="mr-2 text-xs text-gray-300 hover:text-royal-red">Edit</button>}
                    <button onClick={() => handleDelete(msg._id)} className="text-xs text-gray-300 hover:text-royal-red">Delete</button>
                  </div>
                </div>
                {decrypted ? renderMessageContent(msg, decrypted) : (
                  <p className="text-sm text-gray-400 italic">
                    Decrypting...
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
