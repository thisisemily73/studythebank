import React, { useState } from 'react';
import {
    CheckCircle2,
    XCircle,
    ArrowLeft,
    ArrowRight,
    Play,
    RotateCcw,
} from 'lucide-react';

import { questionBank } from '../data/questionBank';
import DifficultyDots from '../components/DifficultyDots';
import '../styles/pages/Practice.css';

export default function Practice({ setIsDesmosOpen }) {
    const [phase, setPhase] = useState('setup');

    // Filter & config options
    const [selectedTest, setSelectedTest] = useState('SAT');

    const [subtopics, setSubtopics] = useState({
        'Information and Ideas': true,
        'Craft and Structure': true,
        'Expression of Ideas': true,
        'Standard English Conventions': true,
        'Algebra': true,
        'Advanced Math': true,
        'Problem-Solving and Data Analysis': true,
        'Geometry and Trigonometry': true,
    });

    const [selectedDifficulties, setSelectedDifficulties] = useState({
        Easy: true,
        Medium: true,
        Hard: true,
    });

    const [shuffle, setShuffle] = useState(false);

    // Active session state
    const [activeQuestions, setActiveQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [userAnswers, setUserAnswers] = useState({});

    // Subtopic filter handlers
    const toggleSubtopic = (key) => {
        setSubtopics((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const toggleAllSection = (sectionKeys, value) => {
        setSubtopics((prev) => {
            const updated = { ...prev };

            sectionKeys.forEach((key) => {
                updated[key] = value;
            });

            return updated;
        });
    };

    const toggleDifficulty = (key) => {
        setSelectedDifficulties((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // Generate a practice set based on the selected filters
    const handleStartPractice = () => {
        let flattened = [];

        if (Array.isArray(questionBank)) {
            flattened = questionBank
                .flat(Infinity)
                .filter((item) => item && typeof item === 'object');
        }

        const filtered = flattened.filter((q) => {
            const domain = q.domain || 'Standard English Conventions';
            const difficulty = q.difficulty || 'Medium';

            if (subtopics[domain] === false) return false;
            if (!selectedDifficulties[difficulty]) return false;

            return true;
        });

        // Don't silently ignore the user's filters
        if (filtered.length === 0) {
            return;
        }

        const finalQuestions = shuffle
            ? [...filtered].sort(() => Math.random() - 0.5)
            : filtered;

        setActiveQuestions(finalQuestions);
        setCurrentIndex(0);
        setSelectedOption(null);
        setIsSubmitted(false);
        setUserAnswers({});
        setPhase('active');
    };

    // Safely resolve the current question
    let rawQ = activeQuestions[currentIndex];

    while (Array.isArray(rawQ)) {
        rawQ = rawQ[0];
    }

    const currentQ = rawQ || {};

    // Some questions have their information nested inside "question"
    const innerQ =
        currentQ.question && typeof currentQ.question === 'object'
            ? currentQ.question
            : currentQ;

    const choicesMap = innerQ.choices || currentQ.choices || {};

    const questionText =
        innerQ.question ||
        innerQ.prompt ||
        currentQ.questionText ||
        'Question text unavailable';

    const paragraphText =
        innerQ.paragraph && innerQ.paragraph !== 'null'
            ? innerQ.paragraph
            : currentQ.paragraph && currentQ.paragraph !== 'null'
                ? currentQ.paragraph
                : null;

    const explanationText =
        innerQ.explanation ||
        currentQ.explanation ||
        'No explanation provided.';

    const correctAnswer =
        innerQ.correct_answer ||
        currentQ.correct_answer ||
        currentQ.correctOption ||
        'A';

    const domain = currentQ.domain || '';
    const difficulty = currentQ.difficulty || 'Medium';

    const mathDomains = [
        'Algebra',
        'Advanced Math',
        'Problem-Solving and Data Analysis',
        'Geometry and Trigonometry',
    ];

    const isMathDomain = mathDomains.includes(domain);
    const questionSection = isMathDomain ? 'Math' : 'Reading and Writing';

    // Answer handlers
    const handleSelect = (key) => {
        if (isSubmitted) return;

        setSelectedOption(key);
    };

    const handleSubmitAnswer = () => {
        if (!selectedOption) return;

        setIsSubmitted(true);

        setUserAnswers((prev) => ({
            ...prev,
            [currentIndex]: selectedOption,
        }));
    };

    const handleNext = () => {
        if (currentIndex >= activeQuestions.length - 1) return;

        const nextIndex = currentIndex + 1;

        setCurrentIndex(nextIndex);

        if (userAnswers[nextIndex]) {
            setSelectedOption(userAnswers[nextIndex]);
            setIsSubmitted(true);
        } else {
            setSelectedOption(null);
            setIsSubmitted(false);
        }
    };

    const handlePrev = () => {
        if (currentIndex <= 0) return;

        const previousIndex = currentIndex - 1;

        setCurrentIndex(previousIndex);

        if (userAnswers[previousIndex]) {
            setSelectedOption(userAnswers[previousIndex]);
            setIsSubmitted(true);
        } else {
            setSelectedOption(null);
            setIsSubmitted(false);
        }
    };

    // Subtopic lists
    const rwSubtopics = [
        'Information and Ideas',
        'Craft and Structure',
        'Expression of Ideas',
        'Standard English Conventions',
    ];

    const mathSubtopics = [
        'Algebra',
        'Advanced Math',
        'Problem-Solving and Data Analysis',
        'Geometry and Trigonometry',
    ];

    // Setup view
    if (phase === 'setup') {
        return (
            <main className="practice-page">
                <div className="practice-setup">
                    <header className="practice-page-header">
                        <p className="practice-eyebrow">Practice Bank</p>

                        <h1 className="practice-title">
                            Build a practice session
                        </h1>

                        <p className="practice-subtitle">
                            Choose what you want to practice, then jump straight into
                            official SAT questions.
                        </p>
                    </header>

                    <section className="practice-card">
                        {/* Test type */}
                        <div className="practice-section">
                            <div className="practice-section-header">
                                <div>
                                    <span className="practice-step">01</span>
                                    <h2>Choose your test</h2>
                                </div>
                            </div>

                            <div className="test-options">
                                {['SAT', 'PSAT/NMSQT & PSAT 10', 'PSAT 8/9'].map(
                                    (test) => (
                                        <label
                                            key={test}
                                            className={`test-option ${selectedTest === test ? 'selected' : ''
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="testType"
                                                checked={selectedTest === test}
                                                onChange={() => setSelectedTest(test)}
                                            />

                                            <span className="custom-radio" />

                                            <span>{test}</span>
                                        </label>
                                    )
                                )}
                            </div>
                        </div>

                        <div className="practice-divider" />

                        {/* Reading & Writing subtopics */}
                        <div className="practice-section">
                            <div className="practice-section-header">
                                <div>
                                    <span className="practice-step">02</span>
                                    <h2>Reading & Writing</h2>
                                </div>

                                <div className="section-actions">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleAllSection(rwSubtopics, true)
                                        }
                                    >
                                        Select All
                                    </button>

                                    <span>/</span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleAllSection(rwSubtopics, false)
                                        }
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            <div className="subtopics-grid">
                                {rwSubtopics.map((subtopic) => (
                                    <label
                                        key={subtopic}
                                        className={`subtopic-option ${subtopics[subtopic] ? 'selected' : ''
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={subtopics[subtopic]}
                                            onChange={() => toggleSubtopic(subtopic)}
                                        />

                                        <span className="custom-checkbox">
                                            {subtopics[subtopic] && '✓'}
                                        </span>

                                        <span>{subtopic}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Math subtopics */}
                        <div className="practice-section">
                            <div className="practice-section-header">
                                <div>
                                    <span className="practice-step">03</span>
                                    <h2>Math</h2>
                                </div>

                                <div className="section-actions">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleAllSection(mathSubtopics, true)
                                        }
                                    >
                                        Select All
                                    </button>

                                    <span>/</span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleAllSection(mathSubtopics, false)
                                        }
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            <div className="subtopics-grid">
                                {mathSubtopics.map((subtopic) => (
                                    <label
                                        key={subtopic}
                                        className={`subtopic-option ${subtopics[subtopic] ? 'selected' : ''
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={subtopics[subtopic]}
                                            onChange={() => toggleSubtopic(subtopic)}
                                        />

                                        <span className="custom-checkbox">
                                            {subtopics[subtopic] && '✓'}
                                        </span>

                                        <span>{subtopic}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="practice-divider" />

                        {/* Difficulty */}
                        <div className="practice-section">
                            <div className="practice-section-header">
                                <div>
                                    <span className="practice-step">04</span>
                                    <h2>Difficulty</h2>
                                </div>
                            </div>

                            <div className="difficulty-options">
                                {['Easy', 'Medium', 'Hard'].map((difficultyOption) => (
                                    <label
                                        key={difficultyOption}
                                        className={`difficulty-option ${selectedDifficulties[difficultyOption] ? 'selected' : ''
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedDifficulties[difficultyOption]}
                                            onChange={() => toggleDifficulty(difficultyOption)}
                                        />

                                        <span className="custom-checkbox">
                                            {selectedDifficulties[difficultyOption] && '✓'}
                                        </span>

                                        <span className="difficulty-option-label">
                                            {difficultyOption}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Additional options */}
                        <div className="practice-section practice-options-section">
                            <div className="practice-section-header">
                                <div>
                                    <span className="practice-step">05</span>
                                    <h2>Options</h2>
                                </div>
                            </div>

                            <label className="shuffle-option">
                                <input
                                    type="checkbox"
                                    checked={shuffle}
                                    onChange={() => setShuffle((prev) => !prev)}
                                />

                                <span className="custom-checkbox">
                                    {shuffle && '✓'}
                                </span>

                                <span>
                                    <strong>Shuffle questions</strong>
                                    <small>
                                        Mix the order of questions in your session.
                                    </small>
                                </span>
                            </label>
                        </div>

                        <button
                            type="button"
                            onClick={handleStartPractice}
                            className="practice-start-button"
                        >
                            <Play size={17} fill="currentColor" />
                            Start Practice Session
                        </button>
                    </section>
                </div>
            </main>
        );
    }

    // Active session view
    return (
        <main className="practice-page">
            <div className="practice-active">
                <div className="practice-topbar">
                    <button
                        type="button"
                        onClick={() => setPhase('setup')}
                        className="back-button"
                    >
                        <RotateCcw size={15} />
                        Back to Customizer
                    </button>

                    {isMathDomain && (
                        <button
                            type="button"
                            onClick={() => setIsDesmosOpen(true)}
                            className="desmos-button"
                        >
                            🧮 Open Desmos
                        </button>
                    )}
                </div>

                {/* Progress bar */}
                <div className="practice-progress">
                    <div className="practice-progress-info">
                        <span>
                            Question {currentIndex + 1} of {activeQuestions.length}
                        </span>

                        <span>
                            {Math.round(
                                ((currentIndex + 1) / activeQuestions.length) * 100
                            )}
                            %
                        </span>
                    </div>

                    <div className="progress-track">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${((currentIndex + 1) / activeQuestions.length) * 100
                                    }%`,
                            }}
                        />
                    </div>
                </div>

                <section className="question-card">
                    {/* Question metadata */}
                    <div className="question-meta">
                        <span className="question-number">
                            Question {currentIndex + 1}
                        </span>

                        <div className="question-tags">
                            <span className="question-domain">
                                {domain || questionSection}
                            </span>

                            <DifficultyDots difficulty={difficulty} />
                        </div>
                    </div>

                    {/* Passage */}
                    {paragraphText && (
                        <div className="passage-box">
                            {paragraphText}
                        </div>
                    )}

                    {/* Question */}
                    <div className="question-prompt">
                        {questionText}
                    </div>

                    {/* Answer choices */}
                    <div className="choices-list">
                        {Object.entries(choicesMap).map(([key, value]) => {
                            let stateClass = '';

                            if (selectedOption === key && !isSubmitted) {
                                stateClass = 'selected';
                            }

                            if (isSubmitted) {
                                if (key === correctAnswer) {
                                    stateClass = 'correct';
                                } else if (
                                    selectedOption === key &&
                                    selectedOption !== correctAnswer
                                ) {
                                    stateClass = 'incorrect';
                                }
                            }

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleSelect(key)}
                                    disabled={isSubmitted}
                                    className={`choice-option-btn ${stateClass}`}
                                >
                                    <span className="choice-letter">
                                        {key}
                                    </span>

                                    <span className="choice-text">
                                        {value}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Answer submission / feedback */}
                    {!isSubmitted ? (
                        <button
                            type="button"
                            onClick={handleSubmitAnswer}
                            disabled={!selectedOption}
                            className="check-answer-button"
                        >
                            Check Answer
                        </button>
                    ) : (
                        <div className="answer-feedback">
                            <div
                                className={`feedback-box ${selectedOption === correctAnswer
                                    ? 'feedback-correct'
                                    : 'feedback-incorrect'
                                    }`}
                            >
                                <div className="feedback-heading">
                                    {selectedOption === correctAnswer ? (
                                        <>
                                            <CheckCircle2 size={18} />
                                            Correct!
                                        </>
                                    ) : (
                                        <>
                                            <XCircle size={18} />
                                            Incorrect
                                        </>
                                    )}
                                </div>

                                {selectedOption !== correctAnswer && (
                                    <p className="correct-answer-text">
                                        The correct answer was{' '}
                                        <strong>{correctAnswer}</strong>.
                                    </p>
                                )}

                                <div className="explanation">
                                    <span>Explanation</span>
                                    <p>{explanationText}</p>
                                </div>
                            </div>

                            {currentIndex < activeQuestions.length - 1 && (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="next-question-button"
                                >
                                    Next Question
                                    <ArrowRight size={17} />
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* Previous / next navigation */}
                <div className="question-navigation">
                    <button
                        type="button"
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="navigation-button"
                    >
                        <ArrowLeft size={16} />
                        Previous
                    </button>

                    <span>
                        {currentIndex + 1} / {activeQuestions.length}
                    </span>

                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={currentIndex === activeQuestions.length - 1}
                        className="navigation-button"
                    >
                        Next
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </main>
    );
}