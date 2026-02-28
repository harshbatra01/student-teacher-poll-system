import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { usePollTimer } from '../../hooks/usePollTimer';
import { ChatPanel } from '../../components/ChatPanel';
import { TimerIcon } from '../../components/TimerIcon';

const StudentPollPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentPoll, socket, tabId, hasVoted, kicked } = useAppContext();
    const [pickedOption, setPickedOption] = useState<number | null>(null);
    const [answerSent, setAnswerSent] = useState(false);

    const { formatted, isExpired } = usePollTimer({
        remainingTime: currentPoll?.remainingTime ?? 0,
        isActive: currentPoll?.isActive ?? false,
        startedAt: currentPoll?.startedAt,
        timerDuration: currentPoll?.timerDuration,
    });

    // Redirect if kicked
    useEffect(() => {
        if (kicked) navigate('/student/kicked');
    }, [kicked, navigate]);

    // Redirect to results when poll ends (with delay so students see correct/incorrect)
    useEffect(() => {
        if (currentPoll && !currentPoll.isActive) {
            const delayHandle = setTimeout(() => {
                navigate('/student/results');
            }, 3000);
            return () => clearTimeout(delayHandle);
        }
    }, [currentPoll, navigate]);

    // If timer expires before voting
    useEffect(() => {
        if (isExpired && currentPoll?.isActive && !hasVoted && !answerSent) {
            navigate('/student/results');
        }
    }, [isExpired, currentPoll, hasVoted, answerSent, navigate]);

    // No poll → go to waiting
    useEffect(() => {
        if (!currentPoll) {
            navigate('/student/wait');
        }
    }, [currentPoll, navigate]);

    const handleSubmit = () => {
        if (pickedOption === null || !currentPoll?.isActive) return;

        socket?.emit('poll:vote', {
            tabId,
            optionIndex: pickedOption,
        });

        setAnswerSent(true);
    };

    if (!currentPoll) return null;

    return (
        <div className="page-container">
            <div className="poll-container">
                {/* Header row: Question label + Timer */}
                <div className="poll-header">
                    <span className="poll-question-label">Question 1</span>
                    <span className="poll-timer">
                        <TimerIcon size={18} />
                        <span className="poll-timer-value">{formatted}</span>
                    </span>
                </div>

                {/* Single card that wraps question + options/results */}
                <div className="poll-options-card">
                    {/* Question banner */}
                    <div className="question-banner">
                        {currentPoll.question}
                    </div>

                    {(hasVoted || answerSent) ? (
                        /* ── Live results view after voting ──────── */
                        currentPoll.options.map((option, idx) => (
                            <div key={idx} className={`result-row ${!currentPoll.isActive ? (option.isCorrect ? 'result-row--correct' : 'result-row--incorrect') : ''}`}>
                                <div className="result-row-bar">
                                    <div
                                        className="result-row-fill"
                                        style={{ width: `${option.percentage}%` }}
                                    />
                                    <div className="result-row-content">
                                        <span className="result-row-label">
                                            <span className={`option-number option-number--small ${option.percentage > 0 ? '' : 'option-number--muted'}`}>
                                                {idx + 1}
                                            </span>
                                            <span>{option.text}</span>
                                        </span>
                                        <span className="result-row-pct">{option.percentage}%</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        /* ── Options to vote ──────────────────────── */
                        currentPoll.options.map((option, idx) => (
                            <div
                                key={idx}
                                className={`option-item ${pickedOption === idx ? 'option-item--selected' : ''}`}
                                onClick={() => setPickedOption(idx)}
                            >
                                <span className={`option-number ${pickedOption === idx ? 'option-number--selected' : 'option-number--muted'}`}>
                                    {idx + 1}
                                </span>
                                <span className="option-text">{option.text}</span>
                            </div>
                        ))
                    )}
                </div>

                {/* Submit button or waiting message */}
                {(hasVoted || answerSent) ? (
                    <p className="subtitle" style={{ textAlign: 'center' }}>
                        Waiting for others to vote...
                    </p>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                            className="btn btn--primary"
                            onClick={handleSubmit}
                            disabled={pickedOption === null}
                            style={{ minWidth: '200px' }}
                        >
                            Submit
                        </button>
                    </div>
                )}
            </div>

            <ChatPanel />
        </div>
    );
};

export default StudentPollPage;
