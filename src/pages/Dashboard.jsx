import React from 'react';
import {
    ArrowRight,
    BookOpen,
    Target,
    Flame,
    TrendingUp,
} from 'lucide-react';

import '../styles/pages/Dashboard.css';

export default function Dashboard({ user, setView }) {
    const displayName = user?.displayName?.split(' ')[0] || 'there';

    const stats = [
        {
            label: 'Questions Answered',
            value: '0',
            icon: BookOpen,
        },
        {
            label: 'Accuracy',
            value: '—',
            icon: Target,
        },
        {
            label: 'Current Streak',
            value: '0 days',
            icon: Flame,
        },
        {
            label: 'Skills Mastered',
            value: '0',
            icon: TrendingUp,
        },
    ];

    return (
        <main className="dashboard-page">
            <div className="dashboard-container">
                <section className="dashboard-welcome">
                    <div>
                        <p className="dashboard-eyebrow">
                            Your SAT prep
                        </p>

                        <h1>
                            Welcome back, {displayName}.
                        </h1>

                        <p className="dashboard-subtitle">
                            Keep practicing and build your score one
                            question at a time.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="dashboard-practice-button"
                        onClick={() => setView('practice')}
                    >
                        Start Practicing
                        <ArrowRight size={18} />
                    </button>
                </section>

                <section className="dashboard-stats">
                    {stats.map((stat) => {
                        const Icon = stat.icon;

                        return (
                            <div
                                key={stat.label}
                                className="dashboard-stat-card"
                            >
                                <div className="dashboard-stat-icon">
                                    <Icon size={20} />
                                </div>

                                <div>
                                    <p className="dashboard-stat-value">
                                        {stat.value}
                                    </p>

                                    <p className="dashboard-stat-label">
                                        {stat.label}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </section>

                <section className="dashboard-grid">
                    <div className="dashboard-card dashboard-focus-card">
                        <div className="dashboard-card-header">
                            <div>
                                <p className="dashboard-card-eyebrow">
                                    Recommended
                                </p>

                                <h2>Keep practicing</h2>
                            </div>
                        </div>

                        <p className="dashboard-card-text">
                            Answer practice questions to build your
                            skills and start seeing your progress here.
                        </p>

                        <button
                            type="button"
                            className="dashboard-card-button"
                            onClick={() => setView('practice')}
                        >
                            Practice questions
                            <ArrowRight size={17} />
                        </button>
                    </div>

                    <div className="dashboard-card">
                        <div className="dashboard-card-header">
                            <div>
                                <p className="dashboard-card-eyebrow">
                                    Your progress
                                </p>

                                <h2>Analytics</h2>
                            </div>
                        </div>

                        <p className="dashboard-card-text">
                            Once you start practicing, your accuracy,
                            strengths, and areas to improve will appear
                            here.
                        </p>

                        <button
                            type="button"
                            className="dashboard-card-button secondary"
                            onClick={() => setView('analytics')}
                        >
                            View analytics
                            <ArrowRight size={17} />
                        </button>
                    </div>
                </section>

                <section className="dashboard-empty-state">
                    <div className="dashboard-empty-icon">
                        <BookOpen size={22} />
                    </div>

                    <div>
                        <h2>Your activity will appear here</h2>

                        <p>
                            Complete some practice questions and you'll
                            start seeing your recent activity and
                            progress.
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}