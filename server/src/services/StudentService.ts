import { Student } from '../models/Student';
import { IStudentData } from '../types';

class StudentService {
    // In-memory map for quick lookup
    private roster: Map<string, IStudentData> = new Map();

    async registerStudent(name: string, tabId: string, socketId: string): Promise<IStudentData> {
        const entry: IStudentData = {
            name,
            tabId,
            socketId,
            isActive: true,
        };

        this.roster.set(tabId, entry);

        // Persist to DB
        try {
            await Student.findOneAndUpdate(
                { tabId },
                { name, tabId, socketId, isActive: true },
                { upsert: true, new: true }
            );
        } catch (dbError) {
            console.warn('⚠️  Failed to save student to DB:', dbError);
        }

        return entry;
    }

    async updateSocketId(tabId: string, socketId: string): Promise<void> {
        const entry = this.roster.get(tabId);
        if (entry) {
            entry.socketId = socketId;
            entry.isActive = true;
        }

        try {
            await Student.findOneAndUpdate({ tabId }, { socketId, isActive: true });
        } catch (dbError) {
            console.warn('⚠️  Failed to update student socket:', dbError);
        }
    }

    async kickStudent(tabId: string): Promise<IStudentData | null> {
        const entry = this.roster.get(tabId);
        if (!entry) return null;

        entry.isActive = false;
        this.roster.delete(tabId);

        try {
            await Student.findOneAndUpdate({ tabId }, { isActive: false });
        } catch (dbError) {
            console.warn('⚠️  Failed to update kicked student in DB:', dbError);
        }

        return entry;
    }

    getActiveStudents(): { name: string; tabId: string }[] {
        const onlineStudents: { name: string; tabId: string }[] = [];
        this.roster.forEach((entry) => {
            if (entry.isActive) {
                onlineStudents.push({ name: entry.name, tabId: entry.tabId });
            }
        });
        return onlineStudents;
    }

    getStudentByTabId(tabId: string): IStudentData | undefined {
        return this.roster.get(tabId);
    }

    getStudentBySocketId(socketId: string): IStudentData | undefined {
        for (const entry of this.roster.values()) {
            if (entry.socketId === socketId) return entry;
        }
        return undefined;
    }

    removeBySocketId(socketId: string): void {
        for (const [tabId, entry] of this.roster.entries()) {
            if (entry.socketId === socketId) {
                entry.isActive = false;
                // Keep in map so they can reconnect via updateSocketId
                break;
            }
        }
    }
}

export const studentService = new StudentService();
