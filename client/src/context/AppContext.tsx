import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socket';
import type { AppState, UserRole, PollResults, StudentInfo, PollState } from '../types';
import type { Socket } from 'socket.io-client';

interface AppContextType extends AppState {
    setRole: (role: UserRole) => void;
    setStudentName: (name: string) => void;
    socket: Socket | null;
    resetState: () => void;
}

const defaultState: AppState = {
    role: null,
    studentName: '',
    tabId: '',
    connected: false,
    currentPoll: null,
    students: [],
    hasVoted: false,
    votedOption: undefined,
    error: null,
    kicked: false,
    chatMessages: [],
};

const AppContext = createContext<AppContextType | null>(null);

// Generate or recover tab ID
const resolveTabId = (): string => {
    let storedTabId = sessionStorage.getItem('poll_tabId');
    if (!storedTabId) {
        storedTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('poll_tabId', storedTabId);
    }
    return storedTabId;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [appState, setAppState] = useState<AppState>(() => {
        // Recover state from sessionStorage
        const persisted = sessionStorage.getItem('poll_state');
        if (persisted) {
            try {
                const hydrated = JSON.parse(persisted);
                return { ...defaultState, ...hydrated, tabId: resolveTabId(), connected: false, error: null };
            } catch {
                // ignore
            }
        }
        return { ...defaultState, tabId: resolveTabId() };
    });

    const socketInstanceRef = useRef<Socket | null>(null);

    // Persist state to sessionStorage
    useEffect(() => {
        const { role, studentName, hasVoted, votedOption, kicked, currentPoll, students, chatMessages } = appState;
        sessionStorage.setItem(
            'poll_state',
            JSON.stringify({ role, studentName, hasVoted, votedOption, kicked, currentPoll, students, chatMessages })
        );
    }, [appState.role, appState.studentName, appState.hasVoted, appState.votedOption, appState.kicked, appState.currentPoll, appState.students, appState.chatMessages]);

    // Socket lifecycle
    useEffect(() => {
        const liveSocket = socketService.connect();
        socketInstanceRef.current = liveSocket;

        liveSocket.on('connect', () => {
            setAppState((prev) => ({ ...prev, connected: true }));

            // Request state recovery on reconnection
            if (appState.role) {
                liveSocket.emit('poll:getState', {
                    tabId: appState.tabId,
                    role: appState.role,
                });
            }
        });

        liveSocket.on('disconnect', () => {
            setAppState((prev) => ({ ...prev, connected: false }));
        });

        // ─── Listen for socket events ────────────────────
        liveSocket.on('poll:state', (data: PollState) => {
            setAppState((prev) => ({
                ...prev,
                currentPoll: data.currentPoll,
                students: data.students || [],
                hasVoted: data.hasVoted || false,
                votedOption: data.votedOption,
                chatMessages: data.chatMessages || [],
            }));
        });

        liveSocket.on('chat:message', (incomingMessage) => {
            setAppState((prev) => ({
                ...prev,
                chatMessages: [...prev.chatMessages, incomingMessage],
            }));
        });

        liveSocket.on('poll:new', (freshPoll: PollResults) => {
            setAppState((prev) => ({
                ...prev,
                currentPoll: freshPoll,
                hasVoted: false,
                votedOption: undefined,
            }));
        });

        liveSocket.on('poll:results', (latestResults: PollResults) => {
            setAppState((prev) => ({
                ...prev,
                currentPoll: latestResults,
            }));
        });

        liveSocket.on('poll:ended', (endedResults: PollResults) => {
            setAppState((prev) => ({
                ...prev,
                currentPoll: { ...endedResults, isActive: false },
            }));
        });

        liveSocket.on('student:joined', (data: { students: StudentInfo[] }) => {
            setAppState((prev) => ({
                ...prev,
                students: data.students,
            }));
        });

        liveSocket.on('student:kicked', () => {
            setAppState((prev) => ({
                ...prev,
                kicked: true,
                currentPoll: null,
            }));
        });

        liveSocket.on('error', (data: { message: string }) => {
            setAppState((prev) => ({ ...prev, error: data.message }));
            setTimeout(() => {
                setAppState((prev) => ({ ...prev, error: null }));
            }, 4000);
        });

        return () => {
            liveSocket.removeAllListeners();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setRole = useCallback((role: UserRole) => {
        setAppState((prev) => ({ ...prev, role }));
    }, []);

    const setStudentName = useCallback((name: string) => {
        setAppState((prev) => ({ ...prev, studentName: name }));
    }, []);

    const resetState = useCallback(() => {
        sessionStorage.removeItem('poll_state');
        sessionStorage.removeItem('poll_tabId');
        setAppState({ ...defaultState, tabId: resolveTabId() });
    }, []);

    return (
        <AppContext.Provider
            value={{
                ...appState,
                setRole,
                setStudentName,
                socket: socketInstanceRef.current,
                resetState,
            }}
        >
            {children}
            {appState.error && <div className="toast toast--error">{appState.error}</div>}
        </AppContext.Provider>
    );
};

export const useAppContext = (): AppContextType => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
    return ctx;
};
