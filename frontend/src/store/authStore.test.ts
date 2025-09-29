import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useAuthStore from './authStore';
import api from '@/api/axios';
import * as crypto from '@/lib/crypto';

// Mock dependencies
vi.mock('@/api/axios');
vi.mock('@/lib/crypto');

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useAuthStore', () => {
  const mockUser = { _id: '1', username: 'testuser', email: 'test@test.com' };
  const mockToken = 'fake-token';
  const mockPrivateKeys = { key: 'fake-private-key' };
  const mockEncryptedKeys = 'encrypted-keys';

  beforeEach(() => {
    // Reset mocks, the store's state, and localStorage before each test
    vi.resetAllMocks();
    localStorageMock.clear();
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

  it('should decrypt and load private keys on login', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { token: mockToken } });
    vi.mocked(api.get).mockResolvedValue({ data: mockUser });
    vi.mocked(crypto.decryptPrivateKeys).mockResolvedValue(mockPrivateKeys as any);
    localStorageMock.setItem(`encryptedPrivateKeys_${mockUser.email}`, mockEncryptedKeys);

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login(mockUser.email, 'password');
    });

    expect(crypto.decryptPrivateKeys).toHaveBeenCalledWith(mockEncryptedKeys, 'password');
    expect(result.current.privateKeys).toEqual(mockPrivateKeys);
  });

  it('should clear token, user, and stored keys on logout', async () => {
    const { result } = renderHook(() => useAuthStore());
    const removeItemSpy = vi.spyOn(localStorageMock, 'removeItem');

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
    expect(removeItemSpy).toHaveBeenCalledWith(`encryptedPrivateKeys_${mockUser.email}`);
  });

  it('should encrypt and store private keys on register', async () => {
    const mockIdentity = {
      _private: mockPrivateKeys,
      public: { identityKey: 'fake-public-key' },
    };
    vi.mocked(crypto.generateIdentity).mockResolvedValue(mockIdentity as any);
    vi.mocked(crypto.encryptPrivateKeys).mockResolvedValue(mockEncryptedKeys);
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    const setItemSpy = vi.spyOn(localStorageMock, 'setItem');

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.register(mockUser.username, mockUser.email, 'password');
    });

    expect(crypto.generateIdentity).toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith('/auth/register', expect.any(Object));
    expect(crypto.encryptPrivateKeys).toHaveBeenCalledWith(mockPrivateKeys, 'password');
    expect(setItemSpy).toHaveBeenCalledWith(`encryptedPrivateKeys_${mockUser.email}`, mockEncryptedKeys);
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