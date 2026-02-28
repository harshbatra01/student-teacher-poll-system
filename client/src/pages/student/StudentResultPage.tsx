import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { usePollTimer } from '../../hooks/usePollTimer';
import { ChatPanel } from '../../components/ChatPanel';
import { TimerIcon } from '../../components/TimerIcon';

const StudentResultPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentPoll, kicked } = useAppContext();

    const { formatted } = usePollTimer({
        remainingTime: currentPoll?.remainingTime ?? 0,
        isActive: currentPoll?.isActive ?? false,
    });

    // Redirect if kicked
    useEffect(() => {
        if (kicked) navigate('/student/kicked');
    }, [kicked, navigate]);

    // If a new active poll arrives, redirect to poll page
    useEffect(() => {
        if (currentPoll && currentPoll.isActive) {
            navigate('/student/poll');
        }
    }, [currentPoll, navigate]);

    // No poll → go to waiting
    useEffect(() => {
        if (!currentPoll) {
            navigate('/student/wait');
        }
    }, [currentPoll, navigate]);

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

                {/* Question banner */}
                <div className="question-banner">
                    {currentPoll.question}
                </div>

                {/* Results card */}
                <div className="poll-options-card">
                    {currentPoll.options.map((opt, idx) => (
                        <div key={idx} className={`result-row ${opt.isCorrect ? 'result-row--correct' : 'result-row--incorrect'}`}>
                            <div className="result-row-bar">
                                <div
                                    className="result-row-fill"
                                    style={{ width: `${opt.percentage}%` }}
                                />
                                <div className="result-row-content">
                                    <span className="result-row-label">
                                        <span className={`option-number option-number--small ${opt.percentage > 0 ? '' : 'option-number--muted'}`}>
                                            {idx + 1}
                                        </span>
                                        <span>{opt.text}</span>
                                    </span>
                                    <span className="result-row-pct">{opt.percentage}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Wait message */}
                <p className="heading-md" style={{ textAlign: 'center' }}>
                    Wait for the teacher to ask a new question..
                </p>
            </div>

            <ChatPanel />
        </div>
    );
};

export default StudentResultPage;
