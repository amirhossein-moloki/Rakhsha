import { useEffect } from 'react';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';
import useUserStore from '@/store/userStore';

export default function useUsers() {
  const { token } = useAuthStore();
  const { setUsers } = useUserStore();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;
      try {
        const response = await api.get('/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    fetchUsers();
  }, [token, setUsers]);
}
