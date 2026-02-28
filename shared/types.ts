export type UserRole = 'student' | 'teacher';

export interface PollOption {
    text: string;
    votes: number;
    percentage?: number;
    isCorrect: boolean;
}

export interface PollResults {
    question: string;
    options: PollOption[];
    totalVotes: number;
    isActive: boolean;
    remainingTime: number;
    startedAt: string | Date;
    timerDuration: number;
}

export interface PollHistoryItem {
    _id: string;
    question: string;
    options: PollOption[];
    totalVotes: number;
    timerDuration: number;
    createdAt: string | Date;
}

export interface ChatMessage {
    id: string;
    senderName: string;
    senderRole: UserRole;
    text: string;
    timestamp: string | Date;
}

export interface CreatePollPayload {
    question: string;
    options: { text: string; isCorrect: boolean }[];
    timerDuration: number;
}

export interface VotePayload {
    tabId: string;
    optionIndex: number;
}

export interface JoinPayload {
    name?: string;
    tabId: string;
    role: UserRole;
}

export interface KickPayload {
    tabId: string;
}

export interface ChatMessagePayload {
    text: string;
    senderName: string;
    senderRole: UserRole;
}

export interface StudentInfo {
    name: string;
    tabId: string;
}

export interface SharedPollState {
    currentPoll: PollResults | null;
    students: StudentInfo[];
    chatMessages: ChatMessage[];
}
