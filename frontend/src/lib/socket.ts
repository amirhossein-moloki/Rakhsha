import { io, Socket } from 'socket.io-client';
import useAuthStore from '@/store/authStore';

let socket: Socket;
let paddingInterval: ReturnType<typeof setInterval> | null = null;

const PADDING_INTERVAL = 500; // ms, matches server
const PADDING_SIZE = 128; // bytes, can be any size, server ignores content

// Helper to convert byte array to hex string
const bytesToHex = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

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

    // Start sending client-side padding to the server to keep the connection alive
    if (paddingInterval) {
      clearInterval(paddingInterval);
    }
    paddingInterval = setInterval(() => {
      const paddingData = crypto.getRandomValues(new Uint8Array(PADDING_SIZE));
      socket.emit('client_padding', { data: bytesToHex(paddingData) });
    }, PADDING_INTERVAL);

    // Listen for server-side padding (optional, but good practice to acknowledge)
    socket.on('padding_traffic', (data) => {
      // The client doesn't need to do anything with this data.
      // console.log('Received server padding traffic.');
    });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
    // Stop sending padding when the socket is disconnected
    if (paddingInterval) {
      clearInterval(paddingInterval);
      paddingInterval = null;
    }
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
    // Ensure the padding interval is cleared on manual disconnect as well
    if (paddingInterval) {
      clearInterval(paddingInterval);
      paddingInterval = null;
    }
  }
};
