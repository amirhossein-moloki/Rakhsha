import useConversations from '@/hooks/useConversations';
import useConversationStore from '@/store/conversationStore';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';
import NewConversationModal from './NewConversationModal';

import { decryptConversationMetadata } from '@/lib/crypto';
import { useState, useEffect } from 'react';

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
}

export default function ConversationList({ onSelectConversation }: ConversationListProps) {
  useConversations(); // Fetches conversations and populates the store
  const { conversations, setConversations, loading } = useConversationStore();
  const { token } = useAuthStore();
  const [decrypted, setDecrypted] = useState<any>({});
  const [showHidden, setShowHidden] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auto-decrypt metadata when conversations load/change
  useEffect(() => {
    const decryptAll = async () => {
      // THIS IS A PLACEHOLDER KEY. In a real app, this key would be securely retrieved.
      const placeholderKey = Buffer.from('0123456789abcdef0123456789abcdef');
      const newDecrypted: any = {};
      for (const convo of conversations) {
        if (!decrypted[convo._id]) { // Only decrypt if not already done
          try {
            const metadata = await decryptConversationMetadata(convo.encryptedMetadata, placeholderKey);
            newDecrypted[convo._id] = metadata;
          } catch (error) {
            console.error('Failed to decrypt metadata for convo:', convo._id, error);
            // Provide a user-friendly fallback name
            newDecrypted[convo._id] = { name: `Conversation ${convo._id.slice(-6)}`, participants: [] };
          }
        }
      }
      setDecrypted(prev => ({ ...prev, ...newDecrypted }));
    };

    if (conversations.length > 0) {
      decryptAll();
    }
  }, [conversations, decrypted]);

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
    <div className="p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold">Conversations</h2>
        <div>
          <button data-testid="new-conversation-button" onClick={() => setIsModalOpen(true)} className="mr-4 text-sm font-semibold text-gray-300 hover:text-royal-red">
            New
          </button>
          <button onClick={() => setShowHidden(!showHidden)} className="text-sm font-semibold text-gray-300 hover:text-royal-red">
            {showHidden ? 'Show Normal' : 'Show Hidden'}
          </button>
        </div>
      </div>
      <NewConversationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <div className="flex-grow overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <p>No {showHidden ? 'hidden' : ''} conversations found.</p>
            <button onClick={() => setIsModalOpen(true)} className="mt-2 text-sm font-semibold text-gray-300 hover:text-royal-red">
              Start a new one
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredConversations.map((convo) => (
              <li
                key={convo._id}
                className="p-3 flex items-center justify-between rounded-lg cursor-pointer hover:bg-gray-900 transition-colors duration-200"
                onClick={() => onSelectConversation(convo._id)}
              >
                <div className="flex items-center overflow-hidden">
                    {/* Placeholder Icon */}
                    <div className="w-10 h-10 bg-gray-700 rounded-full mr-3 flex-shrink-0"></div>
                    <div className="truncate">
                        <p className="font-semibold text-white truncate">
                            {decrypted[convo._id] ? decrypted[convo._id].name : 'Loading...'}
                        </p>
                    </div>
                </div>
                {/* Simplified Hide/Unhide button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent li's onClick from firing
                    handleHide(convo._id, !convo.isHidden);
                  }}
                  className="px-3 py-1 text-xs font-semibold text-gray-300 bg-gray-800 rounded-full hover:bg-gray-700 ml-2 flex-shrink-0"
                >
                  {convo.isHidden ? 'Unhide' : 'Hide'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
