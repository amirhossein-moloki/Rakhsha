import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useMessageStore from './messageStore';
import { Message } from '@/types/message';

// Minimal mock for the Message type for testing purposes
const createMockMessage = (id: string, convId: string, content: string): Message => ({
  _id: id,
  conversationId: convId,
  senderId: `user-for-${id}`,
  ciphertextPayload: content,
  messageType: 'text',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('useMessageStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    act(() => {
      useMessageStore.setState({ messages: {} });
    });
  });

  it('should have a correct initial state', () => {
    const { result } = renderHook(() => useMessageStore());
    expect(result.current.messages).toEqual({});
  });

  it('should add a message to a new conversation', () => {
    const { result } = renderHook(() => useMessageStore());
    const message1 = createMockMessage('msg1', 'conv1', 'hello');

    act(() => {
      result.current.addMessage(message1);
    });

    expect(result.current.messages['conv1']).toBeDefined();
    expect(result.current.messages['conv1']).toHaveLength(1);
    expect(result.current.messages['conv1'][0]).toEqual(message1);
  });

  it('should add a subsequent message to an existing conversation', () => {
    const { result } = renderHook(() => useMessageStore());
    const message1 = createMockMessage('msg1', 'conv1', 'hello');
    const message2 = createMockMessage('msg2', 'conv1', 'world');

    act(() => {
      result.current.addMessage(message1);
      result.current.addMessage(message2);
    });

    expect(result.current.messages['conv1']).toHaveLength(2);
    expect(result.current.messages['conv1'][1]).toEqual(message2);
  });

  it('should update a specific message', () => {
    const { result } = renderHook(() => useMessageStore());
    const message1 = createMockMessage('msg1', 'conv1', 'initial');
    const message2 = createMockMessage('msg2', 'conv1', 'another');

    act(() => {
      useMessageStore.setState({ messages: { 'conv1': [message1, message2] } });
    });

    const updatedMessage = { ...message1, ciphertextPayload: 'updated' };

    act(() => {
      result.current.updateMessage(updatedMessage);
    });

    expect(result.current.messages['conv1']).toHaveLength(2);
    expect(result.current.messages['conv1'][0].ciphertextPayload).toBe('updated');
    expect(result.current.messages['conv1'][1].ciphertextPayload).toBe('another'); // Ensure other messages are untouched
  });

  it('should delete a specific message', () => {
    const { result } = renderHook(() => useMessageStore());
    const message1 = createMockMessage('msg1', 'conv1', 'to-be-deleted');
    const message2 = createMockMessage('msg2', 'conv1', 'to-be-kept');

    act(() => {
      useMessageStore.setState({ messages: { 'conv1': [message1, message2] } });
    });

    act(() => {
      result.current.deleteMessage('msg1', 'conv1');
    });

    expect(result.current.messages['conv1']).toHaveLength(1);
    expect(result.current.messages['conv1'][0]).toEqual(message2);
  });

  it('should not affect other conversations when deleting a message', () => {
    const { result } = renderHook(() => useMessageStore());
    const message1_conv1 = createMockMessage('msg1', 'conv1', 'delete this');
    const message1_conv2 = createMockMessage('msg1', 'conv2', 'keep this');

    act(() => {
      useMessageStore.setState({
        messages: {
          'conv1': [message1_conv1],
          'conv2': [message1_conv2]
        }
      });
    });

    act(() => {
      result.current.deleteMessage('msg1', 'conv1');
    });

    expect(result.current.messages['conv1']).toHaveLength(0);
    expect(result.current.messages['conv2']).toHaveLength(1);
    expect(result.current.messages['conv2'][0]).toEqual(message1_conv2);
  });
});