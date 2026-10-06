import React from 'react';
import {
    Target,
    Flame,
    CheckCircle2,
    ArrowRight,
    TrendingUp,
} from 'lucide-react';

import '../styles/pages/Analytics.css';

export default function Analytics({ setView }) {
    // Temporary data until practice results are connected
    const stats = {
        questionsAnswered: 47,
        accuracy: 72,
        currentStreak: 4,
        mastered: 21,
    };

    const skills = [
        {
            name: 'Information and Ideas',
            section: 'Reading and Writing',
            accuracy: 82,
            questions: 11,
        },
        {
            name: 'Craft and Structure',
            section: 'Reading and Writing',
            accuracy: 74,
            questions: 9,
        },
        {
            name: 'Expression of Ideas',
            section: 'Reading and Writing',
            accuracy: 61,
            questions: 8,
        },
        {
            name: 'Standard English Conventions',
            section: 'Reading and Writing',
            accuracy: 78,
            questions: 6,
        },
        {
            name: 'Algebra',
            section: 'Math',
            accuracy: 86,
            questions: 7,
        },
        {
            name: 'Advanced Math',
            section: 'Math',
            accuracy: 58,
            questions: 6,
        },
    ];

    // Lower accuracy means more practice is recommended
    const practiceRecommendations = [...skills]
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3);

    const getSkillStatus = (accuracy) => {
        if (accuracy >= 80) return 'strong';
        if (accuracy >= 65) return 'developing';
        return 'needs-work';
    };

    const getStatusLabel = (accuracy) => {
        if (accuracy >= 80) return 'Strong';
        if (accuracy >= 65) return 'Developing';
        return 'Needs practice';
    };

    return (
        <main className="analytics-page">
            <div className="analytics-container">

                {/* Page header */}
                <header className="analytics-header">
                    <div>
                        <p className="analytics-eyebrow">Your Progress</p>

                        <h1 className="analytics-title">
                            See how you're doing
                        </h1>

                        <p className="analytics-subtitle">
                            Track your performance and find the skills that
                            deserve a little more practice.
                        </p>
                    </div>
                </header>

                {/* Overview stats */}
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
                                {stats.questionsAnswered}
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
                                {stats.accuracy}%
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
                                {stats.currentStreak}
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
                                {stats.mastered}
                            </strong>
                        </div>
                    </div>

                </section>

                {/* Skill performance */}
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
                            Based on {stats.questionsAnswered} questions
                        </span>
                    </div>

                    <div className="skills-card">

                        {skills.map((skill) => {
                            const status = getSkillStatus(skill.accuracy);

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
                                                {skill.section} ·{' '}
                                                {skill.questions} questions
                                            </span>
                                        </div>

                                        <div className="skill-result">
                                            <strong>
                                                {skill.accuracy}%
                                            </strong>

                                            <span className={`skill-status ${status}`}>
                                                {getStatusLabel(skill.accuracy)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="skill-progress">
                                        <div
                                            className={`skill-progress-fill ${status}`}
                                            style={{
                                                width: `${skill.accuracy}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}

                    </div>

                </section>

                {/* Recommended practice */}
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

                    <div className="recommendations-grid">

                        {practiceRecommendations.map((skill, index) => (
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
                                        You're currently at{' '}
                                        <strong>{skill.accuracy}%</strong>{' '}
                                        accuracy here.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => setView('practice')}
                                        className="recommendation-button"
                                    >
                                        Practice this skill
                                        <ArrowRight size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}

                    </div>

                </section>

                {/* Empty future activity section */}
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

                    <div className="analytics-empty">
                        <div className="analytics-empty-icon">
                            <TrendingUp size={20} />
                        </div>

                        <h3>
                            Your progress over time will appear here
                        </h3>

                        <p>
                            Keep practicing and you'll be able to see how
                            your accuracy changes over time.
                        </p>

                        <button
                            type="button"
                            onClick={() => setView('practice')}
                            className="analytics-empty-button"
                        >
                            Start practicing
                            <ArrowRight size={15} />
                        </button>
                    </div>

                </section>

            </div>
        </main>
    );
}