import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { ChatPanel } from '../../components/ChatPanel';
import { TimerIcon } from '../../components/TimerIcon';
import { usePollTimer } from '../../hooks/usePollTimer';

import type { PollHistoryItem } from '../../types';

const TeacherDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { currentPoll, socket, tabId } = useAppContext();
    const [pastPolls, setPastPolls] = useState<PollHistoryItem[]>([]);
    const [historyVisible, setHistoryVisible] = useState(false);

    const { formatted } = usePollTimer({
        remainingTime: currentPoll?.remainingTime ?? 0,
        isActive: currentPoll?.isActive ?? false,
        startedAt: currentPoll?.startedAt,
        timerDuration: currentPoll?.timerDuration,
    });

    // Join as teacher on mount
    useEffect(() => {
        socket?.emit('teacher:join', { tabId, role: 'teacher' });
    }, [socket, tabId]);

    // Redirect to create page when no active poll
    useEffect(() => {
        if (!currentPoll) {
            navigate('/teacher/create');
        }
    }, [currentPoll, navigate]);

    const loadHistory = () => {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        fetch(`${backendUrl}/api/polls/history`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success) setPastPolls(data.data);
            })
            .catch(console.error);
    };

    const handleViewHistory = () => {
        loadHistory();
        setHistoryVisible(true);
    };

    if (!currentPoll) return null;

    return (
        <div className="td-page">
            {/* Top bar — only View Poll History button, pinned top-right */}
            <div className="td-topbar">
                {!historyVisible && (
                    <button className="btn td-history-btn" onClick={handleViewHistory}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        View Poll history
                    </button>
                )}
            </div>

            {/* Main content */}
            <div className="td-main">
                {historyVisible ? (
                    /* ── Poll History view ─────────────────────── */
                    <div className="td-history-view">
                        <h1 className="td-history-title">
                            View <strong>Poll History</strong>
                        </h1>
                        {pastPolls.length === 0 ? (
                            <p className="subtitle" style={{ marginTop: 24 }}>No poll history yet.</p>
                        ) : (
                            pastPolls.map((record, idx) => (
                                <div key={record._id} className="td-history-poll">
                                    <p className="td-history-question-label">Question {idx + 1}</p>
                                    <div className="td-question-card">
                                        <div className="td-question-banner">{record.question}</div>
                                        <div className="td-results">
                                            {record.options.map((opt, optIdx) => (
                                                <div key={optIdx} className="result-row">
                                                    <div className="result-row-bar">
                                                        <div className="result-row-fill" style={{ width: `${opt.percentage}%` }} />
                                                        <div className="result-row-content">
                                                            <span className="result-row-label">
                                                                <span className="option-number option-number--small">{optIdx + 1}</span>
                                                                <span>{opt.text}</span>
                                                            </span>
                                                            <span className="result-row-pct">{opt.percentage}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    /* ── Active question view ────────────────────── */
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h2 className="heading-sm" style={{ margin: 0, color: 'var(--color-text-subtle)' }}>
                                Question
                            </h2>
                            {currentPoll.isActive && (
                                <span className="poll-timer">
                                    <TimerIcon size={18} />
                                    <span className="poll-timer-value">{formatted}</span>
                                </span>
                            )}
                        </div>

                        <div className="td-question-card">
                            {/* Dark question banner */}
                            <div className="td-question-banner">
                                {currentPoll.question}
                            </div>

                            {/* Inline result bars */}
                            <div className="td-results">
                                {currentPoll.options.map((opt, optIdx) => (
                                    <div key={optIdx} className="result-row">
                                        <div className="result-row-bar">
                                            <div
                                                className="result-row-fill"
                                                style={{ width: `${opt.percentage}%` }}
                                            />
                                            <div className="result-row-content">
                                                <span className="result-row-label">
                                                    <span className="option-number option-number--small">{optIdx + 1}</span>
                                                    <span>{opt.text}</span>
                                                </span>
                                                <span className="result-row-pct">{opt.percentage}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Ask new question button (shown when poll ends) */}
                        {!currentPoll.isActive && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button
                                    className="btn btn--primary"
                                    onClick={() => navigate('/teacher/create')}
                                >
                                    + Ask a new question
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Floating Chat / Participants User Interface */}
            <ChatPanel />
        </div>
    );
};

export default TeacherDashboard;
