import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useUsers from './useUsers';
import useAuthStore from '@/store/authStore';
import useUserStore from '@/store/userStore';
import api from '@/api/axios';

// Mock dependencies
vi.mock('@/store/authStore');
vi.mock('@/store/userStore');
vi.mock('@/api/axios');

describe('useUsers Hook', () => {
  const mockSetUsers = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    // Mock the store's return value
    vi.mocked(useUserStore).mockReturnValue({
      setUsers: mockSetUsers,
    });
  });

  it('should fetch users and update store when token is present', async () => {
    const mockUsers = [{ _id: '1', username: 'testuser1' }, { _id: '2', username: 'testuser2' }];
    vi.mocked(useAuthStore).mockReturnValue({ token: 'fake-token' });
    vi.mocked(api.get).mockResolvedValue({ data: mockUsers });

    renderHook(() => useUsers());

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users', {
        headers: { Authorization: 'Bearer fake-token' },
      });
      expect(mockSetUsers).toHaveBeenCalledWith(mockUsers);
    });
  });

  it('should not fetch users if token is not present', () => {
    vi.mocked(useAuthStore).mockReturnValue({ token: null });

    renderHook(() => useUsers());

    expect(api.get).not.toHaveBeenCalled();
    expect(mockSetUsers).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ token: 'fake-token' });
    vi.mocked(api.get).mockRejectedValue(new Error('API Error'));

    // Mock console.error to check if it's called
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useUsers());

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    // setUsers should not be called on error
    expect(mockSetUsers).not.toHaveBeenCalled();
    // Check if the error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch users:', expect.any(Error));

    // Restore original console.error
    consoleErrorSpy.mockRestore();
  });
});