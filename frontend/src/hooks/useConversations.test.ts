import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useConversations from './useConversations';
import useAuthStore from '@/store/authStore';
import useConversationStore from '@/store/conversationStore';
import api from '@/api/axios';

// Mock dependencies
vi.mock('@/store/authStore');
vi.mock('@/store/conversationStore');
vi.mock('@/api/axios');

describe('useConversations Hook', () => {
  const mockSetConversations = vi.fn();
  const mockSetLoading = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    // Mock the store's return value for all tests in this suite
    vi.mocked(useConversationStore).mockReturnValue({
      setConversations: mockSetConversations,
      setLoading: mockSetLoading,
    });
  });

  it('should fetch conversations and update store when token is present', async () => {
    const mockConversations = [{ id: '1', name: 'Test Convo' }];
    vi.mocked(useAuthStore).mockReturnValue({ token: 'fake-token' });
    vi.mocked(api.get).mockResolvedValue({ data: mockConversations });

    renderHook(() => useConversations());

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/conversations', {
        headers: { Authorization: 'Bearer fake-token' },
      });
      expect(mockSetConversations).toHaveBeenCalledWith(mockConversations);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should not fetch conversations if token is not present', () => {
    vi.mocked(useAuthStore).mockReturnValue({ token: null });

    renderHook(() => useConversations());

    expect(api.get).not.toHaveBeenCalled();
    expect(mockSetConversations).not.toHaveBeenCalled();
    // It should still set loading to false
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ token: 'fake-token' });
    vi.mocked(api.get).mockRejectedValue(new Error('API Error'));

    renderHook(() => useConversations());

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
      // setLoading(false) is called in the finally block
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    // setConversations should not be called on error
    expect(mockSetConversations).not.toHaveBeenCalled();
  });
});