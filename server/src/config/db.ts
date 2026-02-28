import mongoose from 'mongoose';

export const connectDB = async (): Promise<boolean> => {
    const connectionString = process.env.MONGODB_URI;

    if (!connectionString) {
        console.warn('⚠️  MONGODB_URI not set. Running without database persistence.');
        return false;
    }

    try {
        await mongoose.connect(connectionString, {
            dbName: 'live-polling',
        });
        console.log('✅ MongoDB Atlas connected successfully');
        return true;
    } catch (connectError) {
        console.error('❌ MongoDB connection failed:', connectError);
        console.warn('⚠️  Continuing without database persistence.');
        return false;
    }
};
