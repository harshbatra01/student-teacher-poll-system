import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import type { CreatePollPayload } from '../../types';

const CreatePollPage: React.FC = () => {
    const navigate = useNavigate();
    const { socket, tabId, currentPoll } = useAppContext();

    const [questionText, setQuestionText] = useState('');
    const [answerChoices, setAnswerChoices] = useState([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
    ]);
    const [countdownDuration, setCountdownDuration] = useState(60);

    // Join as teacher on mount
    useEffect(() => {
        socket?.emit('teacher:join', { tabId, role: 'teacher' });
    }, [socket, tabId]);

    // Redirect to dashboard when active poll exists
    useEffect(() => {
        if (currentPoll && currentPoll.isActive) {
            navigate('/teacher/dashboard');
        }
    }, [currentPoll, navigate]);

    const handleChoiceChange = (idx: number, text: string) => {
        const revised = [...answerChoices];
        revised[idx] = { ...revised[idx], text };
        setAnswerChoices(revised);
    };

    const handleCorrectnessToggle = (idx: number, isCorrect: boolean) => {
        const revised = [...answerChoices];
        revised[idx] = { ...revised[idx], isCorrect };
        setAnswerChoices(revised);
    };

    const appendOption = () => {
        if (answerChoices.length < 6) {
            setAnswerChoices([...answerChoices, { text: '', isCorrect: false }]);
        }
    };

    const handleSubmit = () => {
        const nonEmptyChoices = answerChoices.filter((choice) => choice.text.trim());
        if (!questionText.trim() || nonEmptyChoices.length < 2) return;

        const payload: CreatePollPayload = {
            question: questionText.trim(),
            options: nonEmptyChoices,
            timerDuration: countdownDuration,
        };

        socket?.emit('poll:create', payload);
    };

    const isFormValid = questionText.trim() && answerChoices.filter((choice) => choice.text.trim()).length >= 2;

    return (
        <div className="create-poll-page">
            {/* Header */}
            <div className="create-poll-header">
                <div className="nav-badge">✦ Intervue Poll</div>
                <h1 className="heading-lg" style={{ marginBottom: '4px' }}>
                    Let's <strong>Get Started</strong>
                </h1>
                <p className="subtitle">
                    you'll have the ability to create and manage polls, ask questions, and monitor
                    your students' responses in real-time.
                </p>
            </div>

            {/* Form Body */}
            <div className="create-poll-body">
                {/* Question + Timer row */}
                <div className="create-poll-question-row">
                    <div style={{ flex: 1 }}>
                        <label className="create-poll-label">Enter your question</label>
                        <textarea
                            className="input-field input-field--flat create-poll-textarea"
                            placeholder="Rahul Bajaj"
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            maxLength={100}
                        />
                        <div className="char-counter">{questionText.length}/100</div>
                    </div>
                    <div className="create-poll-timer-group">
                        <select
                            className="create-poll-timer-select"
                            value={countdownDuration}
                            onChange={(e) => setCountdownDuration(Number(e.target.value))}
                        >
                            <option value={15}>15 seconds</option>
                            <option value={30}>30 seconds</option>
                            <option value={45}>45 seconds</option>
                            <option value={60}>60 seconds</option>
                        </select>
                    </div>
                </div>

                {/* Options */}
                <div>
                    <div className="create-poll-options-header">
                        <span className="create-poll-label" style={{ margin: 0 }}>Edit Options</span>
                        <span className="create-poll-label" style={{ margin: 0, marginRight: '72px' }}>Is it Correct?</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {answerChoices.map((choice, idx) => (
                            <div key={idx} className="create-poll-option-row">
                                <span className="option-number" style={{ width: '28px', height: '28px', fontSize: '12px', flexShrink: 0 }}>
                                    {idx + 1}
                                </span>
                                <input
                                    type="text"
                                    className="input-field input-field--flat"
                                    placeholder={`Option ${idx + 1}`}
                                    value={choice.text}
                                    onChange={(e) => handleChoiceChange(idx, e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <div className="correct-toggle">
                                    <label>
                                        <input
                                            type="radio"
                                            name={`correct-${idx}`}
                                            checked={choice.isCorrect === true}
                                            onChange={() => handleCorrectnessToggle(idx, true)}
                                        />
                                        Yes
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            name={`correct-${idx}`}
                                            checked={choice.isCorrect === false}
                                            onChange={() => handleCorrectnessToggle(idx, false)}
                                        />
                                        No
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>

                    {answerChoices.length < 6 && (
                        <button className="add-option-btn add-option-btn--outlined" onClick={appendOption} style={{ marginTop: '12px' }}>
                            + Add More option
                        </button>
                    )}
                </div>
            </div>

            {/* Fixed bottom bar */}
            <div className="create-poll-footer">
                <button
                    className="btn btn--primary"
                    onClick={handleSubmit}
                    disabled={!isFormValid}
                >
                    Ask Question
                </button>
            </div>
        </div>
    );
};

export default CreatePollPage;
