import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useAuthStore from './authStore';
import api from '@/api/axios';
import * as crypto from '@/lib/crypto';

// Mock dependencies
vi.mock('@/api/axios');
vi.mock('@/lib/crypto');

describe('useAuthStore', () => {
  const mockUser = { id: '1', username: 'testuser', email: 'test@test.com' };
  const mockToken = 'fake-token';
  const mockPrivateKeys = { key: 'fake-private-key' };

  beforeEach(() => {
    // Reset mocks and the store's state before each test
    vi.resetAllMocks();
    act(() => {
      useAuthStore.setState(useAuthStore.getInitialState());
    });
  });

  it('should set token and user on login', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { token: mockToken } });
    vi.mocked(api.get).mockResolvedValue({ data: mockUser });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login('test@test.com', 'password');
    });

    expect(result.current.token).toBe(mockToken);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isSecretMode).toBe(false);
  });

  it('should clear token and user on logout', async () => {
    const { result } = renderHook(() => useAuthStore());

    // First, set a logged-in state
    act(() => {
      result.current.setToken(mockToken);
      result.current.setUser(mockUser);
    });
    expect(result.current.token).toBe(mockToken);

    // Then, log out
    await act(async () => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('should set private keys on register', async () => {
    const mockIdentity = {
      _private: mockPrivateKeys,
      public: { identityKey: 'fake-public-key' },
    };
    vi.mocked(crypto.generateIdentity).mockResolvedValue(mockIdentity as any);
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.register('user', 'email', 'pass');
    });

    expect(crypto.generateIdentity).toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith('/auth/register', expect.any(Object));
    expect(result.current.privateKeys).toEqual(mockPrivateKeys);
  });

  it('should handle secret login', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { token: mockToken } });
    vi.mocked(api.get).mockResolvedValue({ data: mockUser });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.secretLogin('testuser', 'secondary-password');
    });

    expect(result.current.token).toBe(mockToken);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isSecretMode).toBe(true);
  });
});