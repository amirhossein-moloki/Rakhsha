import { io, Socket } from 'socket.io-client';
import useAuthStore from '@/store/authStore';

let socket: Socket;

export const initSocket = () => {
  const { token } = useAuthStore.getState();

  if (socket || !token) {
    return;
  }

  socket = io('http://localhost:3000', {
    auth: {
      token,
    },
  });

  socket.on('connect', () => {
    console.log('Connected to socket server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};
