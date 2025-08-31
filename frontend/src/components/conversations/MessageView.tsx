import { useState } from 'react';
import useAuthStore from '@/store/authStore';
import useMessageStore from '@/store/messageStore';
import { decryptMessage, encryptMessage } from '@/lib/crypto';
import { createStore } from '@/lib/crypto';
import api from '@/api/axios';

interface MessageViewProps {
  conversationId: string;
}

export default function MessageView({ conversationId }: MessageViewProps) {
  const { token, privateKeys } = useAuthStore();
  const { messages, deleteMessage: deleteFromStore } = useMessageStore();
  const conversationMessages = messages[conversationId] || [];
  const [decryptedMessages, setDecryptedMessages] = useState<any>({});
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [editText, setEditText] = useState('');

  const handleDecrypt = async (message: any) => {
    try {
      if (!privateKeys) return;
      const store = createStore({ _private: privateKeys, registrationId: 0 });
      const plaintext = await decryptMessage(store, message.senderId, message.ciphertextPayload);
      setDecryptedMessages((prev) => ({ ...prev, [message._id]: plaintext }));
    } catch (error) {
      console.error('Failed to decrypt message:', error);
    }
  };

  const handleEdit = (message: any) => {
    setEditingMessage(message);
    setEditText(decryptedMessages[message._id] || '');
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !privateKeys || !token) return;
    try {
      const store = createStore({ _private: privateKeys, registrationId: 0 });
      const ciphertext = await encryptMessage(store, editingMessage.senderId, editText);
      await api.put(`/conversations/messages/${editingMessage._id}`, { content: ciphertext }, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold">Messages</h2>
      <div className="flex-1 mt-4 overflow-y-auto">
        <ul>
          {conversationMessages.map((msg) => (
            <li key={msg._id} className="p-2 my-2 border rounded-md">
              <div className="flex justify-between">
                <p className="font-bold">From: {msg.senderId}</p>
                <div>
                  <button onClick={() => handleEdit(msg)} className="mr-2 text-xs text-blue-500">Edit</button>
                  <button onClick={() => handleDelete(msg._id)} className="text-xs text-red-500">Delete</button>
                </div>
              </div>
              {editingMessage?._id === msg._id ? (
                <div>
                  <input value={editText} onChange={e => setEditText(e.target.value)} className="w-full px-2 py-1 border rounded" />
                  <button onClick={handleSaveEdit} className="px-2 py-1 mt-1 text-xs text-white bg-blue-500 rounded">Save</button>
                </div>
              ) : decryptedMessages[msg._id] ? (
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
