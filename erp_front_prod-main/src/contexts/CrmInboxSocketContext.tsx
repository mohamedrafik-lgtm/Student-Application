'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken, SERVER_BASE_URL } from '../lib/api';

interface CrmInboxSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const CrmInboxSocketContext = createContext<CrmInboxSocketContextType>({
  socket: null,
  isConnected: false,
});

export function CrmInboxSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const socketUrl = SERVER_BASE_URL || 'http://localhost:4001';

    const newSocket = io(`${socketUrl}/crm-inbox`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, []);

  return (
    <CrmInboxSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </CrmInboxSocketContext.Provider>
  );
}

export function useCrmInboxSocket() {
  return useContext(CrmInboxSocketContext);
}
