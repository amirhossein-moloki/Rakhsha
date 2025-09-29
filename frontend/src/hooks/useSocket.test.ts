import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useSocket from './useSocket';
import useMessageStore from '@/store/messageStore';
import { getSocket } from '@/lib/socket';
import { Message } from '@/types/message';

// Mock dependencies
vi.mock('@/store/messageStore');
vi.mock('@/lib/socket');

describe('useSocket Hook', () => {
  const mockAddMessage = vi.fn();
  const mockUpdateMessage = vi.fn();
  const mockDeleteMessage = vi.fn();

  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock the store's return value
    vi.mocked(useMessageStore).mockReturnValue({
      addMessage: mockAddMessage,
      updateMessage: mockUpdateMessage,
      deleteMessage: mockDeleteMessage,
    });

    // Mock getSocket to return our fake socket
    vi.mocked(getSocket).mockReturnValue(mockSocket);
  });

  it('should register socket event listeners on mount', () => {
    renderHook(() => useSocket());

    expect(getSocket).toHaveBeenCalledTimes(1);
    expect(mockSocket.on).toHaveBeenCalledWith('receive_message', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('message_edited', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('message_deleted', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledTimes(3);
  });

  it('should not register listeners if socket is not available', () => {
    vi.mocked(getSocket).mockReturnValue(null);
    renderHook(() => useSocket());
    expect(mockSocket.on).not.toHaveBeenCalled();
  });

  it('should call addMessage when "receive_message" event is emitted', () => {
    renderHook(() => useSocket());

    // Find the handler passed to socket.on for 'receive_message'
    const receiveMessageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'receive_message')[1];
    const testMessage: Partial<Message> = { _id: 'msg1', content: 'Hello' };

    // Manually call the handler
    receiveMessageHandler(testMessage);

    expect(mockAddMessage).toHaveBeenCalledWith(testMessage);
  });

  it('should call updateMessage when "message_edited" event is emitted', () => {
    renderHook(() => useSocket());

    const editMessageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message_edited')[1];
    const editedMessage: Partial<Message> = { _id: 'msg1', content: 'Hello Edited' };

    editMessageHandler(editedMessage);

    expect(mockUpdateMessage).toHaveBeenCalledWith(editedMessage);
  });

  it('should call deleteMessage when "message_deleted" event is emitted', () => {
    renderHook(() => useSocket());

    const deleteMessageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message_deleted')[1];
    const deletePayload = { messageId: 'msg1', conversationId: 'conv1' };

    deleteMessageHandler(deletePayload);

    expect(mockDeleteMessage).toHaveBeenCalledWith(deletePayload.messageId, deletePayload.conversationId);
  });

  it('should unregister socket event listeners on unmount', () => {
    const { unmount } = renderHook(() => useSocket());

    // Ensure listeners were registered
    expect(mockSocket.on).toHaveBeenCalledTimes(3);

    unmount();

    // Check that 'off' was called for each event to clean up
    expect(mockSocket.off).toHaveBeenCalledWith('receive_message', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('message_edited', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('message_deleted', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledTimes(3);
  });
});