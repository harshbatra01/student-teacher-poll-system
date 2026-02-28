import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePollTimerOptions {
    remainingTime: number;
    isActive: boolean;
    startedAt?: string;
    timerDuration?: number;
    onExpire?: () => void;
}

export const usePollTimer = ({ remainingTime, isActive, startedAt, timerDuration, onExpire }: UsePollTimerOptions) => {
    // Calculate precise remaining time based on when the poll started
    const computeSecondsLeft = useCallback(() => {
        if (!startedAt || !timerDuration || !isActive) return Math.max(0, Math.floor(remainingTime));
        const originMs = new Date(startedAt).getTime();
        const elapsedSec = (Date.now() - originMs) / 1000;
        return Math.max(0, Math.floor(timerDuration - elapsedSec));
    }, [remainingTime, startedAt, timerDuration, isActive]);

    const [secondsRemaining, setSecondsRemaining] = useState<number>(computeSecondsLeft());
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const expireCallbackRef = useRef(onExpire);
    expireCallbackRef.current = onExpire;

    // Sync with server time whenever props change
    useEffect(() => {
        setSecondsRemaining(computeSecondsLeft());
    }, [remainingTime, startedAt, timerDuration, isActive, computeSecondsLeft]);

    useEffect(() => {
        if (!isActive) {
            if (tickRef.current) {
                clearInterval(tickRef.current);
                tickRef.current = null;
            }
            return;
        }

        // Run tick every second
        tickRef.current = setInterval(() => {
            setSecondsRemaining((prev) => {
                if (prev <= 1) {
                    if (tickRef.current) clearInterval(tickRef.current);
                    tickRef.current = null;
                    expireCallbackRef.current?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (tickRef.current) {
                clearInterval(tickRef.current);
                tickRef.current = null;
            }
        };
    }, [isActive]);

    const formatDuration = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        timeLeft: secondsRemaining,
        formatted: formatDuration(secondsRemaining),
        isExpired: secondsRemaining <= 0,
        percentage: remainingTime > 0 ? (secondsRemaining / remainingTime) * 100 : 0,
    };
};
