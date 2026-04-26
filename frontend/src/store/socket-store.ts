import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(
      typeof window !== 'undefined'
        ? window.location.origin.replace(/:\d+/, '')
        : 'http://localhost',
      {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      },
    );

    socket.on('connect', () => {
      set({ isConnected: true });
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, isConnected: false });
  },

  emit: (event, data) => {
    get().socket?.emit(event, data);
  },

  joinConversation: (conversationId) => {
    get().socket?.emit('conversation:join', { conversationId });
  },

  leaveConversation: (conversationId) => {
    get().socket?.emit('conversation:leave', { conversationId });
  },
}));
