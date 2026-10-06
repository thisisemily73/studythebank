import React, { useEffect, useState } from 'react';
import {
    Target,
    Flame,
    CheckCircle2,
    ArrowRight,
    TrendingUp,
} from 'lucide-react';

import {
    collection,
    getDocs,
    orderBy,
    query,
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import '../styles/pages/Analytics.css';

const SKILLS = [
    {
        name: 'Information and Ideas',
        section: 'Reading and Writing',
    },
    {
        name: 'Craft and Structure',
        section: 'Reading and Writing',
    },
    {
        name: 'Expression of Ideas',
        section: 'Reading and Writing',
    },
    {
        name: 'Standard English Conventions',
        section: 'Reading and Writing',
    },
    {
        name: 'Algebra',
        section: 'Math',
    },
    {
        name: 'Advanced Math',
        section: 'Math',
    },
    {
        name: 'Problem-Solving and Data Analysis',
        section: 'Math',
    },
    {
        name: 'Geometry and Trigonometry',
        section: 'Math',
    },
];

export default function Analytics({ setView }) {
    const [attempts, setAttempts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadAnalytics = async () => {
            const user = auth.currentUser;

            if (!user) {
                setAttempts([]);
                setIsLoading(false);
                return;
            }

            try {
                setError('');

                const attemptsRef = collection(
                    db,
                    'users',
                    user.uid,
                    'practiceAttempts'
                );

                const attemptsQuery = query(
                    attemptsRef,
                    orderBy('timestamp', 'desc')
                );

                const snapshot = await getDocs(attemptsQuery);

                const loadedAttempts = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                setAttempts(loadedAttempts);
            } catch (err) {
                console.error('ANALYTICS ERROR:', err);

                setError(
                    'We could not load your practice data right now.'
                );
            } finally {
                setIsLoading(false);
            }
        };

        loadAnalytics();
    }, []);

    const questionsAnswered = attempts.length;

    const correctAnswers = attempts.filter(
        (attempt) => attempt.isCorrect
    ).length;

    const accuracy =
        questionsAnswered > 0
            ? Math.round(
                  (correctAnswers / questionsAnswered) * 100
              )
            : 0;

    // Find the most recent result for every question.
    const latestAttempts = new Map();

    attempts.forEach((attempt) => {
        if (!attempt.questionId) {
            return;
        }

        if (!latestAttempts.has(attempt.questionId)) {
            latestAttempts.set(
                attempt.questionId,
                attempt
            );
        }
    });

    const mastered = Array.from(
        latestAttempts.values()
    ).filter((attempt) => attempt.isCorrect).length;

    const skills = SKILLS.map((skill) => {
        const skillAttempts = attempts.filter(
            (attempt) =>
                attempt.domain === skill.name
        );

        const skillCorrect = skillAttempts.filter(
            (attempt) => attempt.isCorrect
        ).length;

        const skillAccuracy =
            skillAttempts.length > 0
                ? Math.round(
                      (skillCorrect /
                          skillAttempts.length) *
                          100
                  )
                : 0;

        return {
            ...skill,
            accuracy: skillAccuracy,
            questions: skillAttempts.length,
        };
    });

    // Lower accuracy means more practice is recommended.
    // Skills with no attempts are excluded for now.
    const practiceRecommendations = [...skills]
        .filter((skill) => skill.questions > 0)
        .sort((a, b) => {
            if (a.accuracy !== b.accuracy) {
                return a.accuracy - b.accuracy;
            }

            return b.questions - a.questions;
        })
        .slice(0, 3);

    const getSkillStatus = (skillAccuracy) => {
        if (skillAccuracy >= 80) {
            return 'strong';
        }

        if (skillAccuracy >= 65) {
            return 'developing';
        }

        return 'needs-work';
    };

    const getStatusLabel = (skillAccuracy) => {
        if (skillAccuracy >= 80) {
            return 'Strong';
        }

        if (skillAccuracy >= 65) {
            return 'Developing';
        }

        return 'Needs practice';
    };

    const calculateStreak = () => {
        if (attempts.length === 0) {
            return 0;
        }

        const practiceDays = new Set();

        attempts.forEach((attempt) => {
            if (!attempt.timestamp?.toDate) {
                return;
            }

            const date = attempt.timestamp.toDate();

            const dayKey = date.toLocaleDateString(
                'en-CA'
            );

            practiceDays.add(dayKey);
        });

        if (practiceDays.size === 0) {
            return 0;
        }

        const days = Array.from(practiceDays)
            .map((day) => new Date(`${day}T00:00:00`))
            .sort((a, b) => b - a);

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const mostRecentDay = days[0];

        const daysSincePractice = Math.floor(
            (today - mostRecentDay) /
                (1000 * 60 * 60 * 24)
        );

        // If they haven't practiced today or yesterday,
        // their current streak is no longer active.
        if (daysSincePractice > 1) {
            return 0;
        }

        let streak = 1;

        for (let i = 0; i < days.length - 1; i++) {
            const difference =
                (days[i] - days[i + 1]) /
                (1000 * 60 * 60 * 24);

            if (difference === 1) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    };

    const currentStreak = calculateStreak();

    if (isLoading) {
        return (
            <main className="analytics-page">
                <div className="analytics-container">
                    <div className="analytics-empty">
                        <div className="analytics-empty-icon">
                            <TrendingUp size={20} />
                        </div>

                        <h3>
                            Loading your progress...
                        </h3>

                        <p>
                            We're pulling in your latest
                            practice results.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="analytics-page">
                <div className="analytics-container">
                    <div className="analytics-empty">
                        <div className="analytics-empty-icon">
                            <TrendingUp size={20} />
                        </div>

                        <h3>
                            Something went wrong
                        </h3>

                        <p>{error}</p>

                        <button
                            type="button"
                            onClick={() => setView('practice')}
                            className="analytics-empty-button"
                        >
                            Back to practice
                            <ArrowRight size={15} />
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="analytics-page">
            <div className="analytics-container">

                <header className="analytics-header">
                    <div>
                        <p className="analytics-eyebrow">
                            Your Progress
                        </p>

                        <h1 className="analytics-title">
                            See how you're doing
                        </h1>

                        <p className="analytics-subtitle">
                            Track your performance and find
                            the skills that deserve a little
                            more practice.
                        </p>
                    </div>
                </header>

                <section className="analytics-stats">

                    <div className="analytics-stat-card">
                        <div className="analytics-stat-icon">
                            <Target size={18} />
                        </div>

                        <div>
                            <span className="analytics-stat-label">
                                Questions answered
                            </span>

                            <strong className="analytics-stat-value">
                                {questionsAnswered}
                            </strong>
                        </div>
                    </div>

                    <div className="analytics-stat-card">
                        <div className="analytics-stat-icon">
                            <TrendingUp size={18} />
                        </div>

                        <div>
                            <span className="analytics-stat-label">
                                Overall accuracy
                            </span>

                            <strong className="analytics-stat-value">
                                {accuracy}%
                            </strong>
                        </div>
                    </div>

                    <div className="analytics-stat-card">
                        <div className="analytics-stat-icon">
                            <Flame size={18} />
                        </div>

                        <div>
                            <span className="analytics-stat-label">
                                Current streak
                            </span>

                            <strong className="analytics-stat-value">
                                {currentStreak}
                                <small> days</small>
                            </strong>
                        </div>
                    </div>

                    <div className="analytics-stat-card">
                        <div className="analytics-stat-icon">
                            <CheckCircle2 size={18} />
                        </div>

                        <div>
                            <span className="analytics-stat-label">
                                Questions mastered
                            </span>

                            <strong className="analytics-stat-value">
                                {mastered}
                            </strong>
                        </div>
                    </div>

                </section>

                <section className="analytics-section">

                    <div className="analytics-section-header">
                        <div>
                            <p className="analytics-section-eyebrow">
                                Performance
                            </p>

                            <h2>
                                Accuracy by skill
                            </h2>
                        </div>

                        <span className="analytics-section-note">
                            Based on {questionsAnswered}{' '}
                            questions
                        </span>
                    </div>

                    <div className="skills-card">

                        {skills.map((skill) => {
                            const status =
                                getSkillStatus(
                                    skill.accuracy
                                );

                            return (
                                <div
                                    key={skill.name}
                                    className="skill-row"
                                >
                                    <div className="skill-info">
                                        <div>
                                            <strong>
                                                {skill.name}
                                            </strong>

                                            <span>
                                                {skill.section}{' '}
                                                ·{' '}
                                                {skill.questions}{' '}
                                                questions
                                            </span>
                                        </div>

                                        <div className="skill-result">
                                            <strong>
                                                {skill.questions > 0
                                                    ? `${skill.accuracy}%`
                                                    : '—'}
                                            </strong>

                                            {skill.questions > 0 && (
                                                <span
                                                    className={`skill-status ${status}`}
                                                >
                                                    {getStatusLabel(
                                                        skill.accuracy
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="skill-progress">
                                        <div
                                            className={`skill-progress-fill ${status}`}
                                            style={{
                                                width:
                                                    skill.questions > 0
                                                        ? `${skill.accuracy}%`
                                                        : '0%',
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}

                    </div>

                </section>

                <section className="analytics-section">

                    <div className="analytics-section-header">
                        <div>
                            <p className="analytics-section-eyebrow">
                                Next steps
                            </p>

                            <h2>
                                What to practice next
                            </h2>
                        </div>
                    </div>

                    {practiceRecommendations.length > 0 ? (
                        <div className="recommendations-grid">

                            {practiceRecommendations.map(
                                (skill, index) => (
                                    <div
                                        key={skill.name}
                                        className="recommendation-card"
                                    >
                                        <div className="recommendation-number">
                                            0{index + 1}
                                        </div>

                                        <div className="recommendation-content">
                                            <span className="recommendation-section">
                                                {skill.section}
                                            </span>

                                            <h3>
                                                {skill.name}
                                            </h3>

                                            <p>
                                                You're currently
                                                at{' '}
                                                <strong>
                                                    {skill.accuracy}%
                                                </strong>{' '}
                                                accuracy here.
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setView(
                                                        'practice'
                                                    )
                                                }
                                                className="recommendation-button"
                                            >
                                                Practice this
                                                skill
                                                <ArrowRight
                                                    size={15}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                )
                            )}

                        </div>
                    ) : (
                        <div className="analytics-empty">
                            <div className="analytics-empty-icon">
                                <Target size={20} />
                            </div>

                            <h3>
                                Start practicing to get
                                recommendations
                            </h3>

                            <p>
                                Once you've answered some
                                questions, we'll identify the
                                areas where you can improve.
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    setView('practice')
                                }
                                className="analytics-empty-button"
                            >
                                Start practicing
                                <ArrowRight size={15} />
                            </button>
                        </div>
                    )}

                </section>

                <section className="analytics-section">

                    <div className="analytics-section-header">
                        <div>
                            <p className="analytics-section-eyebrow">
                                Activity
                            </p>

                            <h2>
                                Your practice history
                            </h2>
                        </div>
                    </div>

                    {attempts.length > 0 ? (
                        <div className="analytics-empty">
                            <div className="analytics-empty-icon">
                                <TrendingUp size={20} />
                            </div>

                            <h3>
                                Your history is being
                                recorded
                            </h3>

                            <p>
                                You've answered{' '}
                                <strong>
                                    {attempts.length}
                                </strong>{' '}
                                questions so far. A visual
                                progress chart can be added
                                here next.
                            </p>
                        </div>
                    ) : (
                        <div className="analytics-empty">
                            <div className="analytics-empty-icon">
                                <TrendingUp size={20} />
                            </div>

                            <h3>
                                Your progress over time will
                                appear here
                            </h3>

                            <p>
                                Keep practicing and you'll be
                                able to see how your accuracy
                                changes over time.
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    setView('practice')
                                }
                                className="analytics-empty-button"
                            >
                                Start practicing
                                <ArrowRight size={15} />
                            </button>
                        </div>
                    )}

                </section>

            </div>
        </main>
    );
}