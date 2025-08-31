import useConversations from '@/hooks/useConversations';
import useConversationStore from '@/store/conversationStore';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';
import NewConversationModal from './NewConversationModal';

import { decryptConversationMetadata } from '@/lib/crypto';
import { useState } from 'react';

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
}

export default function ConversationList({ onSelectConversation }: ConversationListProps) {
  useConversations(); // Fetches conversations and populates the store
  const { conversations, setConversations } = useConversationStore();
  const { token } = useAuthStore();
  const [decrypted, setDecrypted] = useState<any>({});
  const [showHidden, setShowHidden] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDecrypt = async (convo: any) => {
    try {
      // THIS IS A PLACEHOLDER KEY. In a real app, this key would be securely retrieved.
      const placeholderKey = Buffer.from('0123456789abcdef0123456789abcdef');
      const metadata = await decryptConversationMetadata(convo.encryptedMetadata, placeholderKey);
      setDecrypted((prev: any) => ({ ...prev, [convo._id]: metadata }));
    } catch (error) {
      console.error('Failed to decrypt metadata:', error);
    }
  };

  const handleHide = async (id: string, hide: boolean) => {
    try {
      const url = `/conversations/${id}/${hide ? 'hide' : 'unhide'}`;
      await api.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });
      // Refresh the conversation list
      const response = await api.get('/conversations', { headers: { Authorization: `Bearer ${token}` } });
      setConversations(response.data);
    } catch (error) {
      console.error(`Failed to ${hide ? 'hide' : 'unhide'} conversation:`, error);
    }
  };

  const filteredConversations = conversations.filter(c => showHidden ? c.isHidden : !c.isHidden);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Conversations</h2>
        <div>
          <button onClick={() => setIsModalOpen(true)} className="mr-2 text-sm text-blue-500">
            New
          </button>
          <button onClick={() => setShowHidden(!showHidden)} className="text-sm text-blue-500">
            {showHidden ? 'Show Normal' : 'Show Hidden'}
          </button>
        </div>
      </div>
      <NewConversationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <ul>
        {filteredConversations.map((convo) => (
          <li
            key={convo._id}
            className="p-2 my-2 border rounded-md cursor-pointer hover:bg-gray-200"
            onClick={() => onSelectConversation(convo._id)}
          >
            <p className="font-bold">Conversation ID: {convo._id}</p>
            {decrypted[convo._id] ? (
              <div>
                <p>Name: {decrypted[convo._id].name}</p>
                <p>Participants: {decrypted[convo._id].participants.join(', ')}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 truncate">
                Encrypted Metadata: {convo.encryptedMetadata}
              </p>
            )}
            <div className="flex mt-2 space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDecrypt(convo);
                }}
                className="px-2 py-1 text-xs text-white bg-blue-500 rounded"
              >
                Decrypt
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleHide(convo._id, true);
                }}
                className="px-2 py-1 text-xs text-white bg-gray-500 rounded"
              >
                Hide
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleHide(convo._id, false);
                }}
                className="px-2 py-1 text-xs text-white bg-gray-500 rounded"
              >
                Unhide
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
