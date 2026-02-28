import { io, Socket } from 'socket.io-client';

const API_ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class SocketService {
    private activeSocket: Socket | null = null;

    connect(): Socket {
        if (this.activeSocket?.connected) {
            return this.activeSocket;
        }

        this.activeSocket = io(API_ENDPOINT, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        this.activeSocket.on('connect', () => {
            console.log('🔌 Socket connected:', this.activeSocket?.id);
        });

        this.activeSocket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
        });

        this.activeSocket.on('connect_error', (err) => {
            console.error('⚠️ Socket connection error:', err.message);
        });

        return this.activeSocket;
    }

    getSocket(): Socket | null {
        return this.activeSocket;
    }

    disconnect(): void {
        if (this.activeSocket) {
            this.activeSocket.disconnect();
            this.activeSocket = null;
        }
    }
}

export const socketService = new SocketService();
