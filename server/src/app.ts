import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import httpRoutes from './handlers/HttpRoutes';
import { setupPollSocketHandler } from './handlers/PollSocketHandler';

const expressApp = express();

const permittedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost'];

const httpServer = createServer(expressApp);

const socketServer = new Server(httpServer, {
    cors: {
        origin: permittedOrigins,
        methods: ['GET', 'POST'],
    },
});

// Middleware
expressApp.use(cors());
expressApp.use(express.json());

// REST routes
expressApp.use('/api', httpRoutes);

// Socket.io handlers
setupPollSocketHandler(socketServer);

export { httpServer, expressApp as app, socketServer as io };
