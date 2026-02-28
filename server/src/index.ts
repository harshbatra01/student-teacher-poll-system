import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { connectDB } from './config/db';
import { httpServer } from './app';

const SERVER_PORT = process.env.PORT || 3001;

const bootstrap = async () => {
    await connectDB();

    httpServer.listen(SERVER_PORT, () => {
        console.log(`🚀 Server running on http://localhost:${SERVER_PORT}`);
        console.log(`📡 Socket.io ready for connections`);
    });
};

bootstrap().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
