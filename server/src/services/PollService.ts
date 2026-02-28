import { Poll, IPollDocument } from '../models/Poll';
import { CreatePollPayload, PollResults, PollResultOption, PollHistoryItem, ChatMessage, ChatMessagePayload } from '../types';
import crypto from 'crypto';

class PollService {
    // In-memory state for resilience when DB is down
    private currentActivePoll: IPollDocument | null = null;
    private expiryTimer: NodeJS.Timeout | null = null;
    private pollEndCallback: ((results: PollResults) => void) | null = null;
    private conversationLog: ChatMessage[] = [];

    setOnPollEnd(callback: (results: PollResults) => void): void {
        this.pollEndCallback = callback;
    }

    async createPoll(data: CreatePollPayload): Promise<{ success: boolean; poll?: PollResults; error?: string }> {
        // Check if there's already an active poll
        if (this.currentActivePoll && this.currentActivePoll.isActive) {
            return { success: false, error: 'A poll is already active. Wait for it to end or end it manually.' };
        }

        try {
            const newPoll = new Poll({
                question: data.question,
                options: data.options.map((opt) => ({
                    text: opt.text,
                    votes: 0,
                    isCorrect: opt.isCorrect,
                })),
                timerDuration: Math.min(data.timerDuration, 60),
                startedAt: new Date(),
                isActive: true,
                voters: [],
            });

            try {
                await newPoll.save();
            } catch (dbError) {
                console.warn('⚠️  Failed to save poll to DB, continuing in-memory:', dbError);
            }

            this.currentActivePoll = newPoll;
            this.initiateTimer(newPoll);

            return { success: true, poll: this.buildResults(newPoll) };
        } catch (creationError) {
            return { success: false, error: 'Failed to create poll' };
        }
    }

    async submitVote(tabId: string, optionIndex: number): Promise<{ success: boolean; results?: PollResults; error?: string }> {
        if (!this.currentActivePoll || !this.currentActivePoll.isActive) {
            return { success: false, error: 'No active poll to vote on.' };
        }

        if (optionIndex < 0 || optionIndex >= this.currentActivePoll.options.length) {
            return { success: false, error: 'Invalid option selected.' };
        }

        // Race condition guard: check if already voted
        const previouslyVoted = this.currentActivePoll.voters.some((v) => v.tabId === tabId);
        if (previouslyVoted) {
            return { success: false, error: 'You have already voted on this question.' };
        }

        // Add voter and increment vote count
        this.currentActivePoll.voters.push({ tabId, optionIndex });
        this.currentActivePoll.options[optionIndex].votes += 1;

        // Try atomic DB update
        try {
            await Poll.findByIdAndUpdate(this.currentActivePoll._id, {
                $push: { voters: { tabId, optionIndex } },
                $inc: { [`options.${optionIndex}.votes`]: 1 },
            });
        } catch (dbError) {
            console.warn('⚠️  Failed to save vote to DB:', dbError);
        }

        const updatedResults = this.buildResults(this.currentActivePoll);
        return { success: true, results: updatedResults };
    }

    getResults(): PollResults | null {
        if (!this.currentActivePoll) return null;
        return this.buildResults(this.currentActivePoll);
    }

    async getCurrentState(tabId?: string): Promise<{
        currentPoll: PollResults | null;
        hasVoted: boolean;
        votedOption?: number;
        chatMessages: ChatMessage[];
    }> {
        if (!this.currentActivePoll) {
            // Try to recover from DB
            try {
                const persistedPoll = await Poll.findOne({ isActive: true }).sort({ createdAt: -1 });
                if (persistedPoll) {
                    this.currentActivePoll = persistedPoll;
                    // Restart timer with remaining time
                    const elapsedSeconds = (Date.now() - persistedPoll.startedAt.getTime()) / 1000;
                    const secondsLeft = persistedPoll.timerDuration - elapsedSeconds;
                    if (secondsLeft > 0) {
                        this.initiateTimer(persistedPoll, secondsLeft);
                    } else {
                        await this.endPoll();
                    }
                }
            } catch (dbError) {
                console.warn('⚠️  Failed to recover poll from DB:', dbError);
            }
        }

        if (!this.currentActivePoll) {
            return { currentPoll: null, hasVoted: false, chatMessages: this.conversationLog };
        }

        const alreadyVoted = tabId ? this.currentActivePoll.voters.some((v) => v.tabId === tabId) : false;
        const selectedOption = tabId
            ? this.currentActivePoll.voters.find((v) => v.tabId === tabId)?.optionIndex
            : undefined;

        return {
            currentPoll: this.buildResults(this.currentActivePoll),
            hasVoted: alreadyVoted,
            votedOption: selectedOption,
            chatMessages: this.conversationLog,
        };
    }

    addChatMessage(payload: ChatMessagePayload): ChatMessage {
        const chatEntry: ChatMessage = {
            id: crypto.randomUUID(),
            senderName: payload.senderName,
            senderRole: payload.senderRole,
            text: payload.text,
            timestamp: new Date(),
        };
        this.conversationLog.push(chatEntry);

        // Keep history bounded to last 200 messages to prevent memory leak
        if (this.conversationLog.length > 200) {
            this.conversationLog.shift();
        }

        return chatEntry;
    }

    getChatHistory(): ChatMessage[] {
        return this.conversationLog;
    }

    async getPollHistory(): Promise<PollHistoryItem[]> {
        try {
            const archivedPolls = await Poll.find({ isActive: false })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            return archivedPolls.map((record) => {
                const voteSum = record.options.reduce((acc, opt) => acc + opt.votes, 0);
                return {
                    _id: (record._id as any).toString(),
                    question: record.question,
                    options: record.options.map((opt) => ({
                        text: opt.text,
                        votes: opt.votes,
                        percentage: voteSum > 0 ? Math.round((opt.votes / voteSum) * 100) : 0,
                        isCorrect: opt.isCorrect,
                    })),
                    totalVotes: voteSum,
                    timerDuration: record.timerDuration,
                    createdAt: record.createdAt,
                };
            });
        } catch (historyError) {
            console.warn('⚠️  Failed to fetch poll history from DB:', historyError);
            return [];
        }
    }

    async endPoll(): Promise<PollResults | null> {
        if (!this.currentActivePoll) return null;

        this.currentActivePoll.isActive = false;

        if (this.expiryTimer) {
            clearTimeout(this.expiryTimer);
            this.expiryTimer = null;
        }

        try {
            await Poll.findByIdAndUpdate(this.currentActivePoll._id, { isActive: false });
        } catch (dbError) {
            console.warn('⚠️  Failed to update poll status in DB:', dbError);
        }

        const finalResults = this.buildResults(this.currentActivePoll);
        this.currentActivePoll = null;
        return finalResults;
    }

    hasActivePool(): boolean {
        return this.currentActivePoll !== null && this.currentActivePoll.isActive;
    }

    private initiateTimer(poll: IPollDocument, remainingSeconds?: number): void {
        if (this.expiryTimer) {
            clearTimeout(this.expiryTimer);
        }

        const durationSec = remainingSeconds ?? poll.timerDuration;
        const durationMs = durationSec * 1000;

        this.expiryTimer = setTimeout(async () => {
            const finalResults = await this.endPoll();
            if (finalResults && this.pollEndCallback) {
                this.pollEndCallback(finalResults);
            }
        }, durationMs);
    }

    private buildResults(poll: IPollDocument): PollResults {
        const voteSum = poll.options.reduce((acc, opt) => acc + opt.votes, 0);
        const elapsedSeconds = (Date.now() - poll.startedAt.getTime()) / 1000;
        const secondsLeft = Math.max(0, poll.timerDuration - elapsedSeconds);

        return {
            question: poll.question,
            options: poll.options.map((opt) => ({
                text: opt.text,
                votes: opt.votes,
                percentage: voteSum > 0 ? Math.round((opt.votes / voteSum) * 100) : 0,
                isCorrect: opt.isCorrect,
            })),
            totalVotes: voteSum,
            isActive: poll.isActive,
            remainingTime: Math.floor(secondsLeft),
            startedAt: poll.startedAt.toISOString(),
            timerDuration: poll.timerDuration,
        };
    }
}

export const pollService = new PollService();
