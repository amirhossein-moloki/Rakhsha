import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConversationList from './ConversationList';
import useConversationStore from '@/store/conversationStore';
import useAuthStore from '@/store/authStore';
import * as useConversationsHook from '@/hooks/useConversations';
import * as crypto from '@/lib/crypto';

// Mock dependencies at the top level
vi.mock('@/store/conversationStore', () => ({
    __esModule: true,
    default: vi.fn(),
}));
vi.mock('@/store/authStore', () => ({
    __esModule: true,
    default: vi.fn(),
}));
vi.mock('@/hooks/useConversations');
vi.mock('@/lib/crypto', () => ({
  decryptConversationMetadata: vi.fn(),
}));

describe('ConversationList Component', () => {
  const mockConversations = [
    { _id: '1', encryptedMetadata: 'meta1', isHidden: false },
    { _id: '2', encryptedMetadata: 'meta2', isHidden: false },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(useConversationsHook, 'default').mockImplementation(() => {});
    vi.mocked(crypto.decryptConversationMetadata).mockImplementation(async (metadata) => ({
      name: `Decrypted ${metadata}`,
    }));
    vi.mocked(useAuthStore).mockReturnValue({ token: 'fake-token' });
  });

  it('should display loading state initially', () => {
    vi.mocked(useConversationStore).mockReturnValue({
        conversations: [],
        loading: true,
        setConversations: vi.fn(),
    });
    render(<ConversationList onSelectConversation={() => {}} />);
    expect(screen.getByText('Loading conversations...')).toBeInTheDocument();
  });

  it('should display conversations when loaded', async () => {
    vi.mocked(useConversationStore).mockReturnValue({
        conversations: mockConversations,
        loading: false,
        setConversations: vi.fn(),
    });
    render(<ConversationList onSelectConversation={() => {}} />);
    await waitFor(() => {
        expect(screen.getByText('Decrypted meta1')).toBeInTheDocument();
        expect(screen.getByText('Decrypted meta2')).toBeInTheDocument();
    });
  });

  it('should call onSelectConversation when a conversation is clicked', async () => {
    const handleSelect = vi.fn();
    vi.mocked(useConversationStore).mockReturnValue({
        conversations: mockConversations,
        loading: false,
        setConversations: vi.fn(),
    });
    render(<ConversationList onSelectConversation={handleSelect} />);
    await waitFor(() => {
        fireEvent.click(screen.getByText('Decrypted meta1'));
    });
    expect(handleSelect).toHaveBeenCalledWith('1');
  });

  it('should open the new conversation modal when "New" button is clicked', async () => {
    vi.mocked(useConversationStore).mockReturnValue({
        conversations: [],
        loading: false,
        setConversations: vi.fn(),
    });

    render(<ConversationList onSelectConversation={() => {}} />);

    // We mock the modal itself to avoid its complexities
    vi.mock('./NewConversationModal', () => ({
        default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>Modal is Open</div> : null),
    }));

    const newButton = screen.getByTestId('new-conversation-button');
    fireEvent.click(newButton);

    await waitFor(() => {
        expect(screen.getByText(/Modal is Open/i)).toBeInTheDocument();
    });
  });
});