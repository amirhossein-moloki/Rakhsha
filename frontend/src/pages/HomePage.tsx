import { useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ConversationList from '@/components/conversations/ConversationList';
import MessageView from '@/components/conversations/MessageView';
import MessageInput from '@/components/conversations/MessageInput';
import useSocket from '@/hooks/useSocket';
import useAuthStore from '@/store/authStore';

export default function HomePage() {
  useSocket(); // Initialize socket listeners
  const { user, logout } = useAuthStore();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <MainLayout
      sidebar={
        <div>
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Welcome, {user?.username}</h1>
            <div className="flex justify-between mt-2">
              <Link to="/settings" className="text-blue-500 hover:underline">
                Settings
              </Link>
              <button onClick={logout} className="text-red-500 hover:underline">
                Logout
              </button>
            </div>
          </div>
          <ConversationList onSelectConversation={setSelectedConversationId} />
        </div>
      }
    >
      <div className="flex flex-col h-full">
        {selectedConversationId ? (
          <>
            <MessageView conversationId={selectedConversationId} />
            <MessageInput conversationId={selectedConversationId} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <h1 className="text-2xl text-gray-500">
              Select a conversation to start messaging
            </h1>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
