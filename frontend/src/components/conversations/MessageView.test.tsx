import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessageView from './MessageView';
import useAuthStore from '@/store/authStore';
import useUserStore from '@/store/userStore';
import useMessageStore from '@/store/messageStore';
import useConversationStore from '@/store/conversationStore';
import * as crypto from '@/lib/crypto';
import api from '@/api/axios';

// Mock dependencies
vi.mock('@/store/authStore');
vi.mock('@/store/userStore');
vi.mock('@/store/messageStore');
vi.mock('@/store/conversationStore');
vi.mock('@/lib/crypto');
vi.mock('@/api/axios');

describe('MessageView Component', () => {
  const mockUser = { _id: 'user1', username: 'testuser' };
  const mockOtherUser = { _id: 'user2', username: 'otheruser' };
  const mockMessages = {
    'conv1': [
      { _id: 'msg1', ciphertextPayload: '{"cipher": "hello"}', senderIdentityKey: 'key1', registrationId: 1 },
      { _id: 'msg2', ciphertextPayload: '{"cipher": "world"}', senderIdentityKey: 'key2', registrationId: 2 },
      { _id: 'msg3', ciphertextPayload: '{"cipher": "fail"}', senderIdentityKey: 'key3', registrationId: 3 }, // This one will fail decryption
    ],
  };
   const mockConversation = {
    _id: 'conv1',
    participants: [mockUser, mockOtherUser],
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock stores
    vi.mocked(useAuthStore).mockReturnValue({ token: 'fake-token', user: mockUser });
    vi.mocked(useUserStore).mockReturnValue({ users: [mockUser, mockOtherUser] });
    vi.mocked(useMessageStore).mockReturnValue({ messages: mockMessages, deleteMessage: vi.fn() });

    // Correctly mock zustand store with getState
    const conversationState = { conversations: [mockConversation] };
    vi.mocked(useConversationStore).mockReturnValue(conversationState);
    // @ts-ignore
    useConversationStore.getState = () => conversationState;


    // Mock crypto
    vi.mocked(crypto.decryptMessage).mockImplementation(async (senderKey) => {
        if (senderKey === 'key1') return JSON.stringify({ senderId: 'user1', content: 'Hello there!', timestamp: '2023-01-01T12:00:00Z' });
        if (senderKey === 'key2') return JSON.stringify({ senderId: 'user2', content: 'General Kenobi!', timestamp: '2023-01-01T12:01:00Z' });
        if (senderKey === 'key3') throw new Error("Decryption failed");
        return JSON.stringify({ senderId: 'unknown', content: 'unknown', timestamp: 'unknown' });
    });
    vi.mocked(crypto.encryptMessage).mockResolvedValue({ type: 3, body: 'encrypted-edit' });


    // Mock API
    vi.mocked(api.delete).mockResolvedValue({});
    vi.mocked(api.put).mockResolvedValue({});
  });

  it('should display messages and decrypt them', async () => {
    render(<MessageView conversationId="conv1" />);

    await waitFor(() => {
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
      expect(screen.getByText('General Kenobi!')).toBeInTheDocument();
    });

    const messages = screen.getAllByRole('listitem');
    expect(messages[0]).toHaveTextContent('You');
    expect(messages[1]).toHaveTextContent(mockOtherUser.username);

    expect(screen.getByText('[Decryption Failed]')).toBeInTheDocument();
  });

  it('should only show Edit button for user\'s own messages', async () => {
    render(<MessageView conversationId="conv1" />);

    await waitFor(() => {
      // There is only one message from the user in this setup
      const editButtons = screen.queryAllByRole('button', { name: /edit/i });
      expect(editButtons).toHaveLength(1);

      const myMessage = screen.getByText('You', { selector: 'p' });
      const parentLi = myMessage.closest('li');
      expect(parentLi).toHaveTextContent('Edit');

      const otherUsersMessage = screen.getByText(mockOtherUser.username, { selector: 'p' });
      const otherParentLi = otherUsersMessage.closest('li');
      expect(otherParentLi).not.toHaveTextContent('Edit');
    });
  });

  it('should allow deleting a message', async () => {
    const deleteFromStore = vi.fn();
    vi.mocked(useMessageStore).mockReturnValue({ messages: mockMessages, deleteMessage: deleteFromStore });

    render(<MessageView conversationId="conv1" />);

    await waitFor(() => {
        expect(screen.getAllByRole('button', {name: /delete/i})).toHaveLength(3);
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/conversations/messages/msg1', expect.any(Object));
      expect(deleteFromStore).toHaveBeenCalledWith('msg1', 'conv1');
    });
  });

  it('should allow editing a message', async () => {
    render(<MessageView conversationId="conv1" />);

    let editButton;
    await waitFor(() => {
        editButton = screen.getByRole('button', { name: /edit/i });
        expect(editButton).toBeInTheDocument();
    });

    fireEvent.click(editButton);

    let input;
    await waitFor(() => {
        input = screen.getByDisplayValue('Hello there!');
        expect(input).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: 'Updated Content' } });
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
        expect(crypto.encryptMessage).toHaveBeenCalledWith(mockOtherUser, 'Updated Content');

        expect(api.put).toHaveBeenCalledWith(
            '/conversations/messages/msg1',
            expect.objectContaining({
                messages: expect.any(Array)
            }),
            expect.any(Object)
        );
    });
  });
});