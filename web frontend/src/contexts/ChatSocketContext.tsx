'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken, SERVER_BASE_URL } from '../lib/api';

interface ChatSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: string[];
}

const ChatSocketContext = createContext<ChatSocketContextType>({
  socket: null,
  isConnected: false,
  onlineUserIds: [],
});

export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const socketUrl = SERVER_BASE_URL || 'http://localhost:4001';
    
    const newSocket = io(`${socketUrl}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      // جلب المتصلين عند الاتصال
      newSocket.emit('users:online', {}, (response: { onlineUserIds: string[] }) => {
        if (response?.onlineUserIds) {
          setOnlineUserIds(response.onlineUserIds);
        }
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('user:online', ({ userId }: { userId: string }) => {
      setOnlineUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    });

    newSocket.on('user:offline', ({ userId }: { userId: string }) => {
      setOnlineUserIds((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, []);

  return (
    <ChatSocketContext.Provider value={{ socket, isConnected, onlineUserIds }}>
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  return useContext(ChatSocketContext);
}
