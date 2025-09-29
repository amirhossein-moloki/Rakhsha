import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useConversationStore from './conversationStore';
import { Conversation } from '@/types/conversation';

describe('useConversationStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    act(() => {
      useConversationStore.setState({ conversations: [], loading: true });
    });
  });

  it('should have a correct initial state', () => {
    const { result } = renderHook(() => useConversationStore());
    expect(result.current.conversations).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('should set conversations correctly', () => {
    const { result } = renderHook(() => useConversationStore());
    const mockConversations: Conversation[] = [
      { _id: 'conv1', participants: [], isGroup: false, encryptedMetadata: 'meta1' },
      { _id: 'conv2', participants: [], isGroup: true, groupName: 'Test Group', encryptedMetadata: 'meta2' },
    ];

    act(() => {
      result.current.setConversations(mockConversations);
    });

    expect(result.current.conversations).toEqual(mockConversations);
    expect(result.current.conversations.length).toBe(2);
  });

  it('should set loading state correctly', () => {
    const { result } = renderHook(() => useConversationStore());

    // Initial state is loading: true
    expect(result.current.loading).toBe(true);

    // Set loading to false
    act(() => {
      result.current.setLoading(false);
    });
    expect(result.current.loading).toBe(false);

    // Set loading back to true
    act(() => {
      result.current.setLoading(true);
    });
    expect(result.current.loading).toBe(true);
  });
});