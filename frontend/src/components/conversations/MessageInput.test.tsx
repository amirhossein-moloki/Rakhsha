import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessageInput from './MessageInput';
import useAuthStore from '@/store/authStore';
import useConversationStore from '@/store/conversationStore';
import * as crypto from '@/lib/crypto';
import api from '@/api/axios';

// Mock dependencies
vi.mock('@/store/authStore');
vi.mock('@/store/conversationStore');
vi.mock('@/lib/crypto');
vi.mock('@/api/axios');

describe('MessageInput Component', () => {
  const mockUser = { _id: 'user1', username: 'testuser' };
  const mockConversation = {
    _id: 'conv1',
    participants: [{ _id: 'user1' }, { _id: 'user2' }],
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Mock store implementations
    vi.mocked(useAuthStore).mockReturnValue({
      token: 'fake-token',
      user: mockUser,
      privateKeys: 'fake-keys',
    });

    vi.mocked(useConversationStore).mockReturnValue({
      conversations: [mockConversation],
    });

    // Mock crypto functions
    vi.mocked(crypto.getSignalStore).mockImplementation(() => {});
    vi.mocked(crypto.encryptMessage).mockResolvedValue({ type: 3, body: 'encrypted-message' });

    // Mock api calls
    vi.mocked(api.post).mockResolvedValue({ data: {} });
  });

  it('should render the input field and send button', () => {
    render(<MessageInput conversationId="conv1" />);
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('should update input value on change', () => {
    render(<MessageInput conversationId="conv1" />);
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Hello world' } });
    expect(input.value).toBe('Hello world');
  });

  it('should call handleSendMessage on send button click and clear input', async () => {
    render(<MessageInput conversationId="conv1" />);
    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    // Type a message
    fireEvent.change(input, { target: { value: 'Test message' } });
    expect(input.value).toBe('Test message');

    // Click send
    fireEvent.click(sendButton);

    // waitFor will wait for the async state update to complete
    await waitFor(() => {
      // Check if API was called correctly
      expect(api.post).toHaveBeenCalledWith(
        '/messages',
        expect.objectContaining({
          conversationId: 'conv1',
          messages: expect.any(Array),
        }),
        expect.any(Object)
      );

      // Check if input is cleared after sending
      expect(input.value).toBe('');
    });

    // Check if encryption was called for the recipient
    expect(crypto.encryptMessage).toHaveBeenCalledTimes(2); // Once for payload, once for timestamp
    expect(crypto.encryptMessage).toHaveBeenCalledWith(
      mockConversation.participants[1], // The other participant
      expect.any(String) // The plaintext payload
    );
  });

  it('should not send message if input is empty', () => {
    render(<MessageInput conversationId="conv1" />);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.click(sendButton);

    expect(api.post).not.toHaveBeenCalled();
    expect(crypto.encryptMessage).not.toHaveBeenCalled();
  });
});