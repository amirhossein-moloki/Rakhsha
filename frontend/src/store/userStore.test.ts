import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useUserStore from './userStore';
import { User } from '@/types/user';

describe('useUserStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    act(() => {
      useUserStore.setState({ users: [] });
    });
  });

  it('should have a correct initial state', () => {
    const { result } = renderHook(() => useUserStore());
    expect(result.current.users).toEqual([]);
  });

  it('should set users correctly', () => {
    const { result } = renderHook(() => useUserStore());
    const mockUsers: User[] = [
      { _id: 'user1', username: 'Alice', email: 'alice@example.com' },
      { _id: 'user2', username: 'Bob', email: 'bob@example.com' },
    ];

    act(() => {
      result.current.setUsers(mockUsers);
    });

    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.users.length).toBe(2);
  });

  it('should be able to overwrite existing users with a new list', () => {
    const { result } = renderHook(() => useUserStore());
    const initialUsers: User[] = [{ _id: 'user1', username: 'Alice', email: 'a@a.com' }];
    const newUsers: User[] = [{ _id: 'user3', username: 'Charlie', email: 'c@c.com' }];

    // Set initial state
    act(() => {
      result.current.setUsers(initialUsers);
    });
    expect(result.current.users).toEqual(initialUsers);

    // Set new state
    act(() => {
      result.current.setUsers(newUsers);
    });
    expect(result.current.users).toEqual(newUsers);
    expect(result.current.users.length).toBe(1);
    expect(result.current.users[0].username).toBe('Charlie');
  });
});